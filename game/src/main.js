// Emberward — boot and the one loop: input is read every frame, the world advances
// in fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title, play,
// paused, game over and victory.
//
// ?seed=N fixes the shadow pattern. ?shot=start|play|boss|victory (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  const particles = createParticles(256);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, {
      aim: { x: world.state.player.x, y: world.state.player.y - 100 },
      time: world.state.time,
      particles,
      muted: true,
    });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudio();
  const particles = createParticles(512);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let prevMouseDown = false;

  function announce(text) {
    status.textContent = text;
  }

  function startRun() {
    world.reset();
    world.startWave(1);
    particles.clear();
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.startDrone();
    input.clear();
    announce('Wave 1. Keep the lantern lit.');
  }

  function endRun(won) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    audio.stopDrone();
    screen = won ? SCREEN_VICTORY : SCREEN_OVER;
    announce(won ? `Victory. Score ${world.state.score}.` : `Game over. Score ${world.state.score}.`);
  }

  /** Play the sounds and sparks the simulation queued this frame. */
  function drainFx() {
    const fx = world.state.fx;
    for (let i = 0; i < fx.length; i += 1) {
      const effect = fx[i];
      if (effect.type === 'shoot') {
        audio.shoot();
        particles.burst(effect.x, effect.y, 2, '#ffe9a8', 60, 0.15, 2);
      } else if (effect.type === 'hit') {
        audio.hit();
        particles.burst(effect.x, effect.y, 4, '#ffe9a8', 140, 0.25, 2.5);
      } else if (effect.type === 'die') {
        audio.enemyDie();
        const color = effect.kind === 'dreadlord' ? '#ff4d6d' : '#b9a7ff';
        particles.burst(effect.x, effect.y, effect.kind === 'dreadlord' ? 40 : 12, color, 220, 0.5, 3);
        particles.wisp(effect.x, effect.y, color);
        if (effect.kind === 'dreadlord') particles.ring(effect.x, effect.y, '#ff4d6d', 60);
      } else if (effect.type === 'ember') {
        audio.pickupEmber();
        particles.burst(effect.x, effect.y, 6, '#ffb347', 90, 0.4, 2.5);
      } else if (effect.type === 'heart') {
        audio.pickupHeart();
        particles.burst(effect.x, effect.y, 8, '#ff5d73', 90, 0.4, 2.5);
      } else if (effect.type === 'prism') {
        audio.pickupPrism();
        particles.burst(effect.x, effect.y, 10, '#7fe7ff', 120, 0.5, 2.5);
      } else if (effect.type === 'hurt') {
        audio.hurt();
        particles.burst(effect.x, effect.y, 10, '#ff5d73', 180, 0.4, 3);
      } else if (effect.type === 'horn') {
        audio.waveHorn();
      } else if (effect.type === 'boss') {
        audio.bossRoar();
      } else if (effect.type === 'over') {
        audio.gameOver();
      } else if (effect.type === 'win') {
        audio.victory();
      } else if (effect.type === 'spawn') {
        particles.wisp(effect.x, effect.y, '#7d6bb0');
      } else if (effect.type === 'mote') {
        particles.mote(effect.x, effect.y, '#ffb347');
      }
    }
    fx.length = 0;
  }

  function frame(now) {
    const dt = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    const clicked = input.mouse.down && !prevMouseDown;
    prevMouseDown = input.mouse.down;

    if (input.consume(ACTION_MUTE)) {
      audio.setMuted(!audio.isMuted());
    }

    if (screen === SCREEN_TITLE) {
      audio.unlock();
      world.stepAmbient(dt, world.random);
      drainFx();
      particles.step(dt);
      if (clicked || input.consume(ACTION_CONFIRM)) {
        audio.uiClick();
        startRun();
      }
    } else if (screen === SCREEN_PLAY) {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const events = world.step(STEP, input.move(), input.firing(), input.mouse);
        if (events & EVENT_WIN) {
          drainFx();
          endRun(true);
          break;
        }
        if (events & EVENT_OVER) {
          drainFx();
          endRun(false);
          break;
        }
      }
      drainFx();
      particles.step(dt);
      if (input.consume(ACTION_PAUSE)) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
    } else if (screen === SCREEN_PAUSED) {
      if (input.consume(ACTION_PAUSE) || clicked) {
        screen = SCREEN_PLAY;
        input.clear();
        announce('Resumed.');
      } else if (input.consume(ACTION_RESTART)) {
        startRun();
      }
    } else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
      particles.step(dt);
      if (input.consume(ACTION_RESTART) || clicked || input.consume(ACTION_CONFIRM)) {
        audio.uiClick();
        startRun();
      }
    }

    renderer.draw(world.state, screen, best, {
      aim: input.mouse,
      time: now / 1000,
      particles,
      muted: audio.isMuted(),
    });
    requestAnimationFrame(frame);
  }

  announce('Emberward. Press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
