// The screenshot scenes behind ?shot=start|play|boss|victory. Each one plays the
// real rules forward from a fresh world for a fixed simulated time, steered by an
// autopilot that aims at the nearest shadow, kites out of reach and chases embers
// when the lantern runs low, so the frame is what a skilled game really looks like
// and the same seed always gives the same frame.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_BOSS } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';

const START_SECONDS = 5;
const PLAY_WAVE = 6;
const VICTORY_LIMIT_SECONDS = 900;

/** The nearest enemy to the player, preferring the Dreadlord. */
function nearestEnemy(state) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    const score = enemy.kind === KIND_BOSS ? d * 0.4 : d;
    if (score < bestDist) {
      bestDist = score;
      best = enemy;
    }
  }
  return best;
}

function nearestPickup(state, kind) {
  const player = state.player;
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < state.pickups.length; i += 1) {
    const pickup = state.pickups[i];
    if (kind && pickup.kind !== kind) continue;
    const d = Math.hypot(pickup.x - player.x, pickup.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = pickup;
    }
  }
  return best;
}

/**
 * Steer the Warden for one step: aim at the nearest shadow, fire while any live,
 * chase embers when the lantern runs low, kite out of reach otherwise, and sidestep
 * shadow orbs that are coming in.
 */
export function autopilot(state) {
  const player = state.player;
  const enemy = nearestEnemy(state);
  const aim = enemy ? { x: enemy.x, y: enemy.y } : { x: player.x, y: player.y - 100 };
  let mx = 0;
  let my = 0;
  const add = (x, y, weight) => {
    mx += x * weight;
    my += y * weight;
  };
  const toward = (tx, ty, weight) => {
    const dx = tx - player.x;
    const dy = ty - player.y;
    const d = Math.hypot(dx, dy) || 1;
    add(dx / d, dy / d, weight);
  };
  const awayFrom = (tx, ty, weight) => {
    const dx = player.x - tx;
    const dy = player.y - ty;
    const d = Math.hypot(dx, dy) || 1;
    add(dx / d, dy / d, weight);
  };

  const ember = nearestPickup(state, 'ember');
  const heart = nearestPickup(state, 'heart');
  // A hurt Warden grabs a heart before anything else.
  if (player.hp <= 1 && heart) {
    toward(heart.x, heart.y, 1.5);
  } else if (player.fuel < 55 && ember) {
    toward(ember.x, ember.y, 1.4);
    if (enemy) {
      const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (d < 100) awayFrom(enemy.x, enemy.y, 1.6);
    }
  } else if (enemy) {
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (d < 150) awayFrom(enemy.x, enemy.y, 1.5);
    else if (d > 300) toward(enemy.x, enemy.y, 0.7);
    else {
      // Strafe around the enemy instead of standing still.
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = d || 1;
      add(-dy / dist, dx / dist, 0.8);
    }
  }
  // Repulsion from every close shadow, so the Warden is never surrounded.
  for (let i = 0; i < state.enemies.length; i += 1) {
    const other = state.enemies[i];
    const dx = player.x - other.x;
    const dy = player.y - other.y;
    const d = Math.hypot(dx, dy);
    if (d < 220 && d > 1) {
      const weight = (1 - d / 220) * 1.1;
      add((dx / d) * weight, (dy / d) * weight, 1);
    }
  }
  // Sidestep orbs flying at the Warden.
  for (let i = 0; i < state.orbs.length; i += 1) {
    const orb = state.orbs[i];
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const d = Math.hypot(dx, dy);
    if (d < 130 && d > 1) {
      const closing = (orb.vx * dx + orb.vy * dy) / d;
      if (closing > 60) add(-dy / d, dx / d, 1.2);
    }
  }
  // A steady pull toward the middle of the arena, so the fight stays in frame
  // instead of drifting into a corner.
  toward(FIELD.width / 2, FIELD.height / 2, 0.35);
  // Keep off the walls.
  if (player.x < 70) add(1, 0, 1);
  if (player.x > FIELD.width - 70) add(-1, 0, 1);
  if (player.y < 70) add(0, 1, 1);
  if (player.y > FIELD.height - 70) add(0, -1, 1);

  const length = Math.hypot(mx, my);
  const move = length > 0.01 ? { x: mx / length, y: my / length } : { x: 0, y: 0 };
  return { move, aim, firing: state.enemies.length > 0 };
}

function runPilot(world, seconds, until) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const pilot = autopilot(world.state);
    const events = world.step(STEP, pilot.move, pilot.firing, pilot.aim);
    if (events & EVENT_WIN) return 'win';
    if (events & EVENT_OVER) return 'over';
    if (until && until(world.state)) return 'until';
  }
  return 'time';
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * score to show. Any name other than play, boss or victory is the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'victory') {
    world.state.ambient = true;
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.stepAmbient(STEP, world.random);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'boss') {
    // A real run to wave 10, so the score and the fight are genuine, then into
    // the Dreadlord's arrival until it is about half spent: the frame shows the
    // boss standing, hurt, with its crawlers and the Warden's light on it.
    runPilot(world, 600, (state) => state.wave === 10 && state.waveState === 'active');
    for (let i = 0; i < 12; i += 1) {
      const result = runPilot(world, 0.5);
      if (result === 'over') return { screen: SCREEN_OVER, best: world.state.score };
      if (result === 'win') return { screen: SCREEN_VICTORY, best: world.state.score };
      const boss = world.state.boss;
      if (boss && boss.hp <= boss.maxHp * 0.55) break;
      if (!boss && world.state.enemies.length === 0) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'play') {
    // Fast-forward to wave 6, then play until the field is busy: the frame shows
    // a real mid-wave fight, shadows closing in, bolts flying, the HUD alive.
    runPilot(world, 400, (state) => state.wave === PLAY_WAVE && state.waveState === 'active');
    for (let i = 0; i < 40; i += 1) {
      const result = runPilot(world, 0.5);
      if (result === 'over') return { screen: SCREEN_OVER, best: world.state.score };
      if (result === 'win') return { screen: SCREEN_VICTORY, best: world.state.score };
      if (world.state.enemies.length >= 6) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Victory: the whole game, wave 1 to the Dreadlord's fall.
  const result = runPilot(world, VICTORY_LIMIT_SECONDS);
  if (result === 'win') return { screen: SCREEN_VICTORY, best: world.state.score };
  return { screen: SCREEN_OVER, best: world.state.score };
}
