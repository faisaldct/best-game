// Everything the eye sees: the dark floor, the lantern's glow cutting through it,
// the shadows, the HUD and the screens. The playfield is a fixed 1280x720 logical
// area scaled to the window, so the game looks the same on any desktop.

import { FIELD, FONT, FONT_UI, PALETTE, PLAYER } from './config.js';
import { KIND_BOSS, KIND_CRAWLER, KIND_SPITTER, KIND_WRAITH } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

function heartPath(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size, y - size * 0.45, x - size * 0.45, y - size, x, y - size * 0.35);
  ctx.bezierCurveTo(x + size * 0.45, y - size, x + size, y - size * 0.45, x, y + size * 0.35);
  ctx.closePath();
}

function drawShadow(ctx, enemy, time) {
  const { x, y } = enemy;
  ctx.save();
  ctx.translate(x, y);
  if (enemy.kind === KIND_CRAWLER) {
    const squash = 1 + Math.sin(enemy.t * 6) * 0.06;
    ctx.scale(squash, 1 / squash);
    ctx.fillStyle = '#241a3d';
    ctx.beginPath();
    ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.crawler;
    ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 7, enemy.radius * 0.6);
      ctx.lineTo(i * 9, enemy.radius * 0.6 + 6 + Math.sin(enemy.t * 8 + i) * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#d9c8ff';
    ctx.beginPath();
    ctx.arc(-5, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(5, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === KIND_WRAITH) {
    const sway = Math.sin(enemy.t * 4 + enemy.phase) * 4;
    ctx.fillStyle = '#1d1533';
    ctx.beginPath();
    ctx.moveTo(0, -enemy.radius - 6);
    ctx.quadraticCurveTo(enemy.radius, -enemy.radius * 0.4, enemy.radius * 0.7 + sway, enemy.radius * 0.7);
    ctx.quadraticCurveTo(sway, enemy.radius * 0.4, -enemy.radius * 0.7 + sway, enemy.radius * 0.7);
    ctx.quadraticCurveTo(-enemy.radius, -enemy.radius * 0.4, 0, -enemy.radius - 6);
    ctx.fill();
    ctx.fillStyle = '#efe9ff';
    ctx.beginPath();
    ctx.arc(-4.5, -6, 2.6, 0, Math.PI * 2);
    ctx.arc(4.5, -6, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.wraith;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, enemy.radius * 0.7);
    ctx.lineTo(sway, enemy.radius * 0.7 + 10);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (enemy.kind === KIND_SPITTER) {
    ctx.fillStyle = '#12261a';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.spitter;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius - 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const open = 3 + Math.sin(enemy.t * 3) * 1.5;
    ctx.fillStyle = '#04120a';
    ctx.beginPath();
    ctx.arc(0, 3, open + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8ffce';
    ctx.beginPath();
    ctx.arc(-5, -5, 2.4, 0, Math.PI * 2);
    ctx.arc(5, -5, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (enemy.kind === KIND_BOSS) {
    const pulse = 1 + Math.sin(enemy.t * 2.5) * 0.03;
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#2a0a14';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d0f1e';
    ctx.beginPath();
    ctx.moveTo(-enemy.radius * 0.7, -enemy.radius * 0.6);
    ctx.lineTo(-enemy.radius * 1.15, -enemy.radius * 1.25);
    ctx.lineTo(-enemy.radius * 0.25, -enemy.radius * 0.85);
    ctx.closePath();
    ctx.moveTo(enemy.radius * 0.7, -enemy.radius * 0.6);
    ctx.lineTo(enemy.radius * 1.15, -enemy.radius * 1.25);
    ctx.lineTo(enemy.radius * 0.25, -enemy.radius * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff2e4d';
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(i * 13, -8, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd7de';
    ctx.beginPath();
    ctx.arc(-13, 12, 3, 0, Math.PI * 2);
    ctx.arc(13, 12, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.boss;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius + 8 + Math.sin(time * 3) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const darkness = document.createElement('canvas');
  darkness.width = FIELD.width;
  darkness.height = FIELD.height;
  const dctx = darkness.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }
  resize();
  window.addEventListener('resize', resize);

  function frameTransform(shakeX, shakeY) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    const ox = (canvas.width - FIELD.width * scale) / 2 + shakeX * scale;
    const oy = (canvas.height - FIELD.height * scale) / 2 + shakeY * scale;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
  }

  function drawFloor(time) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Faint rune circles under the arena.
    ctx.strokeStyle = PALETTE.rune;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(FIELD.width / 2, FIELD.height / 2, 300, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(FIELD.width / 2, FIELD.height / 2, 180, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + time * 0.02;
      ctx.beginPath();
      ctx.moveTo(FIELD.width / 2 + Math.cos(a) * 180, FIELD.height / 2 + Math.sin(a) * 180);
      ctx.lineTo(FIELD.width / 2 + Math.cos(a) * 300, FIELD.height / 2 + Math.sin(a) * 300);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Floor motes.
    ctx.fillStyle = '#1c1636';
    for (let gx = 80; gx < FIELD.width; gx += 160) {
      for (let gy = 70; gy < FIELD.height; gy += 140) {
        ctx.fillRect(gx, gy, 2, 2);
      }
    }
  }

  function drawPickups(state, time) {
    for (let i = 0; i < state.pickups.length; i += 1) {
      const p = state.pickups[i];
      if (p.life < 3 && Math.sin(time * 10) > 0) continue;
      const bob = Math.sin(p.t * 4) * 3;
      const y = p.y + bob;
      if (p.kind === 'ember') {
        const flicker = 0.7 + Math.sin(time * 9 + p.x) * 0.3;
        ctx.save();
        ctx.globalAlpha = flicker;
        ctx.fillStyle = PALETTE.ember;
        ctx.shadowColor = PALETTE.emberHot;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(p.x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === 'heart') {
        ctx.save();
        ctx.fillStyle = PALETTE.heart;
        ctx.shadowColor = PALETTE.heart;
        ctx.shadowBlur = 12;
        heartPath(ctx, p.x, y, 9);
        ctx.fill();
        ctx.restore();
      } else {
        ctx.save();
        ctx.translate(p.x, y);
        ctx.rotate(time * 1.5);
        ctx.fillStyle = PALETTE.prism;
        ctx.shadowColor = PALETTE.prism;
        ctx.shadowBlur = 12;
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }
    }
  }

  function drawPlayer(state, aim, time) {
    const player = state.player;
    if (!player) return;
    const blink = player.invuln > 0 && Math.sin(time * 30) > 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    if (blink) ctx.globalAlpha = 0.45;
    const aimAngle = Math.atan2(aim.y - player.y, aim.x - player.x);
    // Cloak.
    ctx.fillStyle = '#2c2150';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(14, -8, 12, 12);
    ctx.quadraticCurveTo(0, 18, -12, 12);
    ctx.quadraticCurveTo(-14, -8, 0, -18);
    ctx.fill();
    ctx.strokeStyle = '#4a3a7d';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Hood and glowing eyes.
    ctx.fillStyle = '#1a1233';
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(-3.5, -8, 1.8, 0, Math.PI * 2);
    ctx.arc(3.5, -8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Lantern arm toward the aim.
    const lx = Math.cos(aimAngle) * 18;
    const ly = Math.sin(aimAngle) * 18;
    ctx.strokeStyle = '#4a3a7d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath();
    ctx.arc(lx, ly, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    ctx.shadowColor = PALETTE.lantern;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(lx, ly, 3 + Math.sin(time * 7) * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawDarkness(state) {
    const player = state.player;
    dctx.clearRect(0, 0, FIELD.width, FIELD.height);
    dctx.globalCompositeOperation = 'source-over';
    dctx.fillStyle = 'rgba(4, 3, 10, 0.78)';
    dctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (player) {
      const fuelRatio = player.fuel / player.maxFuel;
      const radius = PLAYER.glowEmpty + (PLAYER.glowFull - PLAYER.glowEmpty) * fuelRatio;
      const grad = dctx.createRadialGradient(player.x, player.y, radius * 0.15, player.x, player.y, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.85)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.globalCompositeOperation = 'destination-out';
      dctx.fillStyle = grad;
      dctx.beginPath();
      dctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
      dctx.fill();
      // Warm lantern glow inside the lit circle.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, radius * 0.8);
      glow.addColorStop(0, 'rgba(255, 190, 90, 0.20)');
      glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(player.x, player.y, radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.drawImage(darkness, 0, 0);
  }

  /**
   * Light that shines through the dark: the shadows' eyes, the embers, the
   * bolts and the orbs are drawn again over the darkness, so the player can
   * always read what is coming, and the frame never looks empty.
   */
  function drawGlowThrough(state, time) {
    // Enemy eyes, bright enough to read through the dark.
    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      if (enemy.kind === KIND_BOSS) {
        ctx.fillStyle = '#ff2e4d';
        for (let k = -2; k <= 2; k += 1) {
          ctx.beginPath();
          ctx.arc(enemy.x + k * 13, enemy.y - 8, 3.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd7de';
        ctx.beginPath();
        ctx.arc(enemy.x - 13, enemy.y + 12, 3, 0, Math.PI * 2);
        ctx.arc(enemy.x + 13, enemy.y + 12, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.kind === KIND_WRAITH) {
        ctx.fillStyle = '#efe9ff';
        ctx.beginPath();
        ctx.arc(enemy.x - 4.5, enemy.y - 6, 2.6, 0, Math.PI * 2);
        ctx.arc(enemy.x + 4.5, enemy.y - 6, 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.kind === KIND_SPITTER) {
        ctx.fillStyle = '#c8ffce';
        ctx.beginPath();
        ctx.arc(enemy.x - 5, enemy.y - 5, 2.4, 0, Math.PI * 2);
        ctx.arc(enemy.x + 5, enemy.y - 5, 2.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#d9c8ff';
        ctx.beginPath();
        ctx.arc(enemy.x - 5, enemy.y - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(enemy.x + 5, enemy.y - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Ember glows.
    for (let i = 0; i < state.pickups.length; i += 1) {
      const p = state.pickups[i];
      if (p.kind !== 'ember') continue;
      const flicker = 0.7 + Math.sin(time * 9 + p.x) * 0.3;
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.fillStyle = PALETTE.ember;
      ctx.shadowColor = PALETTE.emberHot;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y + Math.sin(p.t * 4) * 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Bolts and orbs shine through as well.
    for (let i = 0; i < state.bolts.length; i += 1) {
      const bolt = state.bolts[i];
      ctx.save();
      ctx.strokeStyle = PALETTE.bolt;
      ctx.shadowColor = PALETTE.bolt;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bolt.x - bolt.vx * 0.02, bolt.y - bolt.vy * 0.02);
      ctx.lineTo(bolt.x, bolt.y);
      ctx.stroke();
      ctx.restore();
    }
    for (let i = 0; i < state.orbs.length; i += 1) {
      const orb = state.orbs[i];
      ctx.strokeStyle = '#b9a7ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawHud(state, best, muted) {
    const player = state.player;
    if (!player) return;
    // Hearts.
    for (let i = 0; i < player.maxHp; i += 1) {
      ctx.save();
      ctx.fillStyle = i < player.hp ? PALETTE.heart : '#3a2430';
      heartPath(ctx, 30 + i * 34, 34, 11);
      ctx.fill();
      ctx.restore();
    }
    // Fuel bar with a lantern mark.
    const barX = 24;
    const barY = 56;
    const barW = 180;
    const barH = 12;
    const fuelRatio = player.fuel / player.maxFuel;
    ctx.fillStyle = '#241a3d';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = fuelRatio < 0.25 ? '#ff5d3a' : PALETTE.ember;
    ctx.fillRect(barX, barY, barW * fuelRatio, barH);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT_UI}`;
    ctx.textAlign = 'left';
    ctx.fillText('LANTERN', barX, barY + 26);
    if (player.prism > 0) {
      ctx.fillStyle = PALETTE.prism;
      ctx.fillText(`PRISM ${Math.ceil(player.prism)}s`, barX, barY + 44);
    }
    // Score.
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 30px ${FONT_UI}`;
    ctx.fillText(String(state.score), FIELD.width / 2, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT_UI}`;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, FIELD.width / 2, 58);
    // Wave.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 22px ${FONT_UI}`;
    ctx.fillText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width - 24, 38);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `13px ${FONT_UI}`;
    const remaining = state.enemies.length + state.spawnQueue.length;
    ctx.fillText(remaining > 0 ? `${remaining} shadows left` : 'clear the dark', FIELD.width - 24, 58);
    // Boss bar.
    if (state.boss) {
      const bw = 420;
      const bx = (FIELD.width - bw) / 2;
      const by = 76;
      ctx.fillStyle = '#2a0a14';
      ctx.fillRect(bx, by, bw, 10);
      ctx.fillStyle = PALETTE.boss;
      ctx.fillRect(bx, by, bw * Math.max(0, state.boss.hp / state.boss.maxHp), 10);
      ctx.strokeStyle = '#6d1f30';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bw, 10);
      ctx.fillStyle = '#ffb3c0';
      ctx.font = `bold 12px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText('THE DREADLORD', FIELD.width / 2, by + 26);
    }
    // Banner.
    if (state.bannerTimer > 0 && state.banner) {
      const alpha = Math.min(1, state.bannerTimer);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.lantern;
      ctx.font = `bold 44px ${FONT}`;
      ctx.fillText(state.banner, FIELD.width / 2, 200);
      ctx.restore();
    }
    // Mute mark.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `12px ${FONT_UI}`;
    ctx.fillText(muted ? 'M — sound off' : 'M — mute', FIELD.width - 24, FIELD.height - 18);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(23, 18, 38, 0.92)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function statsLines(state, best) {
    const accuracy = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    const minutes = Math.floor(state.time / 60);
    const seconds = Math.floor(state.time % 60);
    return [
      `SCORE  ${state.score}`,
      `WAVE  ${state.wave}    KILLS  ${state.kills}`,
      `TIME  ${minutes}:${String(seconds).padStart(2, '0')}    AIM  ${accuracy}%`,
      `BEST  ${Math.max(best, state.score)}`,
    ];
  }

  function drawTitle(state, best, time) {
    ctx.fillStyle = 'rgba(4, 3, 10, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `bold 92px ${FONT}`;
    ctx.fillText('EMBERWARD', FIELD.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 24px ${FONT}`;
    ctx.fillText('Keep the lantern lit. Slay the Dreadlord.', FIELD.width / 2, 292);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT_UI}`;
    ctx.fillText('WASD / arrows — move      Mouse — aim      Click / Space — fire light', FIELD.width / 2, 350);
    ctx.fillText('Embers feed the lantern. Shadows fear the light. Wave 10 wakes the Dreadlord.', FIELD.width / 2, 378);
    if (best > 0) {
      ctx.fillStyle = PALETTE.ember;
      ctx.font = `bold 18px ${FONT_UI}`;
      ctx.fillText(`BEST  ${best}`, FIELD.width / 2, 420);
    }
    const pulse = 0.6 + Math.sin(time * 3) * 0.4;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 20px ${FONT_UI}`;
    ctx.fillText('CLICK OR PRESS ENTER', FIELD.width / 2, 480);
    ctx.restore();
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(4, 3, 10, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 64px ${FONT}`;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `18px ${FONT_UI}`;
    ctx.fillText('P or Esc — resume      R — restart', FIELD.width / 2, 380);
  }

  function drawOver(state, best) {
    ctx.fillStyle = 'rgba(10, 2, 6, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const title = state.overReason === 'dark' ? 'THE DARK TAKES YOU' : 'SLAIN IN THE DARK';
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.boss;
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, 240);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `17px ${FONT_UI}`;
    ctx.fillText(
      state.overReason === 'dark'
        ? 'The lantern burned out. The shadows were patient.'
        : 'The shadows closed in. The lantern still burns for the next Warden.',
      FIELD.width / 2,
      278,
    );
    panel(FIELD.width / 2 - 220, 310, 440, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `18px ${FONT_UI}`;
    const lines = statsLines(state, best);
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 348 + i * 30));
    const pulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 19px ${FONT_UI}`;
    ctx.fillText('PRESS R OR CLICK TO TRY AGAIN', FIELD.width / 2, 510);
    ctx.restore();
  }

  function drawVictory(state, best) {
    ctx.fillStyle = 'rgba(6, 8, 4, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `bold 56px ${FONT}`;
    ctx.fillText('THE DAWN BREAKS', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `italic 22px ${FONT}`;
    ctx.fillText('The Dreadlord is unmade. The lantern burns on.', FIELD.width / 2, 272);
    panel(FIELD.width / 2 - 220, 300, 440, 150);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `18px ${FONT_UI}`;
    const lines = statsLines(state, best);
    lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 338 + i * 30));
    const pulse = 0.6 + Math.sin(Date.now() / 300) * 0.4;
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 19px ${FONT_UI}`;
    ctx.fillText('PRESS R OR CLICK TO PLAY AGAIN', FIELD.width / 2, 500);
    ctx.restore();
  }

  function drawParticles(particles) {
    for (let i = 0; i < particles.items.length; i += 1) {
      const p = particles.items[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      if (p.kind === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1.6 - alpha * 0.6) * 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'wisp') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  return {
    draw(state, screen, best, opts) {
      const { aim, time, particles, muted } = opts;
      const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
      const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      frameTransform(shakeX, shakeY);
      drawFloor(time);
      if (screen !== SCREEN_TITLE) {
        drawPickups(state, time);
        for (let i = 0; i < state.enemies.length; i += 1) drawShadow(ctx, state.enemies[i], time);
        // Shadow orbs.
        for (let i = 0; i < state.orbs.length; i += 1) {
          const orb = state.orbs[i];
          ctx.fillStyle = '#2a0a3d';
          ctx.beginPath();
          ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#b9a7ff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // Light bolts.
        for (let i = 0; i < state.bolts.length; i += 1) {
          const bolt = state.bolts[i];
          ctx.save();
          ctx.strokeStyle = PALETTE.bolt;
          ctx.shadowColor = PALETTE.bolt;
          ctx.shadowBlur = 10;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(bolt.x - bolt.vx * 0.02, bolt.y - bolt.vy * 0.02);
          ctx.lineTo(bolt.x, bolt.y);
          ctx.stroke();
          ctx.restore();
        }
        drawPlayer(state, aim, time);
        drawParticles(particles);
        drawDarkness(state);
        drawGlowThrough(state, time);
        if (state.flash > 0) {
          ctx.fillStyle = `rgba(255, 40, 60, ${state.flash * 0.25})`;
          ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        }
      } else {
        for (let i = 0; i < state.enemies.length; i += 1) drawShadow(ctx, state.enemies[i], time);
        drawParticles(particles);
        drawDarkness(state);
        drawGlowThrough(state, time);
      }
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best, muted);
      if (screen === SCREEN_TITLE) drawTitle(state, best, time);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_VICTORY) drawVictory(state, best);
    },
  };
}
