// The simulation: the Warden, the shadows, the waves, the lantern's fuel and the
// score. Everything advances in fixed 1/60 s steps and touches nothing outside
// this file except the particle and sound effects it queues in state.fx, which the
// main loop drains each frame. The game is won by killing the Dreadlord on wave 10
// and lost when the Warden's hearts run out or the lantern's fuel does.

import { BOLT, ENEMY, FIELD, ORB, PICKUP, PLAYER, STEP, WAVE } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_BOSS = 16;

export const KIND_CRAWLER = 'crawler';
export const KIND_WRAITH = 'wraith';
export const KIND_SPITTER = 'spitter';
export const KIND_BOSS = 'dreadlord';

const KINDS = [KIND_CRAWLER, KIND_WRAITH, KIND_SPITTER, KIND_BOSS];

function edgePoint(random, player) {
  for (let tries = 0; tries < 8; tries += 1) {
    const side = random.int(0, 3);
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = random.range(40, FIELD.width - 40);
      y = 30;
    } else if (side === 1) {
      x = random.range(40, FIELD.width - 40);
      y = FIELD.height - 30;
    } else if (side === 2) {
      x = 30;
      y = random.range(40, FIELD.height - 40);
    } else {
      x = FIELD.width - 30;
      y = random.range(40, FIELD.height - 40);
    }
    const dx = x - player.x;
    const dy = y - player.y;
    if (dx * dx + dy * dy > 280 * 280) return { x, y };
  }
  return { x: 60, y: 60 };
}

function makeEnemy(kind, x, y, wave) {
  const spec = ENEMY[kind];
  const speedScale = 1 + Math.min(0.35, (wave - 1) * 0.03);
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed * speedScale,
    score: spec.score,
    t: 0,
    shootCd: 1.5 + Math.random() * 1.5,
    burstCd: 3,
    summonCd: 6,
    phase: Math.random() * Math.PI * 2,
  };
}

function buildWaveList(wave, random) {
  const list = [];
  if (wave === WAVE.bossWave) {
    list.push(KIND_BOSS);
    for (let i = 0; i < 4; i += 1) list.push(KIND_CRAWLER);
    return list;
  }
  const count = WAVE.baseCount + WAVE.perWave * wave;
  const crawlers = Math.ceil(count * 0.55);
  const wraiths = wave >= 2 ? Math.floor(count * 0.28) : 0;
  const spitters = Math.max(0, count - crawlers - wraiths);
  for (let i = 0; i < crawlers; i += 1) list.push(KIND_CRAWLER);
  for (let i = 0; i < wraiths; i += 1) list.push(KIND_WRAITH);
  for (let i = 0; i < spitters; i += 1) list.push(KIND_SPITTER);
  // Shuffle so the wave arrives mixed, not in kind order.
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = random.int(0, i);
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
}

export function createWorld(random) {
  const state = {
    player: null,
    bolts: [],
    enemies: [],
    orbs: [],
    pickups: [],
    fx: [],
    wave: 0,
    waveState: 'breather',
    waveTimer: 1.2,
    spawnQueue: [],
    spawnTimer: 0,
    score: 0,
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    time: 0,
    over: false,
    won: false,
    overReason: '',
    banner: '',
    bannerTimer: 0,
    shake: 0,
    flash: 0,
    ambient: false,
    boss: null,
  };

  function reset() {
    state.player = {
      x: FIELD.width / 2,
      y: FIELD.height / 2,
      radius: PLAYER.radius,
      hp: PLAYER.maxHp,
      maxHp: PLAYER.maxHp,
      fuel: PLAYER.maxFuel,
      maxFuel: PLAYER.maxFuel,
      invuln: 0,
      fireCd: 0,
      prism: 0,
    };
    state.bolts.length = 0;
    state.enemies.length = 0;
    state.orbs.length = 0;
    state.pickups.length = 0;
    state.fx.length = 0;
    state.wave = 0;
    state.waveState = 'breather';
    state.waveTimer = 1.2;
    state.spawnQueue = [];
    state.spawnTimer = 0;
    state.score = 0;
    state.kills = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.time = 0;
    state.over = false;
    state.won = false;
    state.overReason = '';
    state.banner = '';
    state.bannerTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.ambient = false;
    state.boss = null;
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue = buildWaveList(n, random);
    state.spawnTimer = 0.4;
    state.waveState = 'active';
    if (n === WAVE.bossWave) {
      state.banner = 'THE DREADLORD';
      state.fx.push({ type: 'boss' });
    } else {
      state.banner = `WAVE ${n}`;
      state.fx.push({ type: 'horn' });
    }
    state.bannerTimer = 2;
  }

  function dropPickup(x, y) {
    const roll = random.next();
    let kind = null;
    if (roll < PICKUP.emberChance) kind = 'ember';
    else if (roll < PICKUP.emberChance + PICKUP.heartChance) kind = 'heart';
    else if (roll < PICKUP.emberChance + PICKUP.heartChance + PICKUP.prismChance) kind = 'prism';
    if (!kind) return;
    state.pickups.push({ kind, x, y, t: 0, life: PICKUP.lifeSeconds });
  }

  function killEnemy(index) {
    const enemy = state.enemies[index];
    state.score += enemy.score;
    state.kills += 1;
    state.fx.push({ type: 'die', x: enemy.x, y: enemy.y, kind: enemy.kind });
    dropPickup(enemy.x, enemy.y);
    if (enemy.kind === KIND_BOSS) {
      state.boss = null;
      state.won = true;
      state.fx.push({ type: 'win' });
    }
    state.enemies.splice(index, 1);
  }

  function hurtPlayer() {
    const player = state.player;
    if (player.invuln > 0 || state.over || state.won) return;
    player.hp -= 1;
    player.invuln = PLAYER.invulnerable;
    state.shake = 14;
    state.flash = 1;
    state.fx.push({ type: 'hurt', x: player.x, y: player.y });
    if (player.hp <= 0) {
      state.over = true;
      state.overReason = 'slain';
      state.fx.push({ type: 'over' });
    }
  }

  function fireBolt(aim) {
    const player = state.player;
    const base = Math.atan2(aim.y - player.y, aim.x - player.x);
    const angles = player.prism > 0 ? [-0.22, 0, 0.22] : [0];
    for (let i = 0; i < angles.length; i += 1) {
      const a = base + angles[i];
      state.bolts.push({
        x: player.x + Math.cos(a) * (player.radius + 6),
        y: player.y + Math.sin(a) * (player.radius + 6),
        vx: Math.cos(a) * BOLT.speed,
        vy: Math.sin(a) * BOLT.speed,
        radius: BOLT.radius,
        damage: BOLT.damage,
        life: BOLT.life,
      });
    }
    state.shotsFired += angles.length;
    state.fx.push({ type: 'shoot', x: player.x, y: player.y, angle: base });
  }

  function stepEnemy(enemy, dt) {
    const player = state.player;
    enemy.t += dt;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    if (enemy.kind === KIND_CRAWLER) {
      enemy.x += nx * enemy.speed * dt;
      enemy.y += ny * enemy.speed * dt;
    } else if (enemy.kind === KIND_WRAITH) {
      const wobble = Math.sin(enemy.t * 5 + enemy.phase) * 0.7;
      const px = -ny * wobble;
      const py = nx * wobble;
      enemy.x += (nx + px) * enemy.speed * dt;
      enemy.y += (ny + py) * enemy.speed * dt;
    } else if (enemy.kind === KIND_SPITTER) {
      if (dist > 300) {
        enemy.x += nx * enemy.speed * dt;
        enemy.y += ny * enemy.speed * dt;
      } else if (dist < 200) {
        enemy.x -= nx * enemy.speed * dt;
        enemy.y -= ny * enemy.speed * dt;
      } else {
        enemy.x += -ny * enemy.speed * 0.6 * dt;
        enemy.y += nx * enemy.speed * 0.6 * dt;
      }
      enemy.shootCd -= dt;
      if (enemy.shootCd <= 0 && dist < 520) {
        enemy.shootCd = 2.2 + random.next() * 0.8;
        state.orbs.push({
          x: enemy.x,
          y: enemy.y,
          vx: nx * ORB.speed,
          vy: ny * ORB.speed,
          radius: ORB.radius,
          life: ORB.life,
        });
        state.fx.push({ type: 'spit', x: enemy.x, y: enemy.y });
      }
    } else if (enemy.kind === KIND_BOSS) {
      enemy.x += nx * enemy.speed * dt;
      enemy.y += ny * enemy.speed * dt;
      enemy.burstCd -= dt;
      if (enemy.burstCd <= 0) {
        enemy.burstCd = 3;
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2 + enemy.phase;
          state.orbs.push({
            x: enemy.x + Math.cos(a) * enemy.radius,
            y: enemy.y + Math.sin(a) * enemy.radius,
            vx: Math.cos(a) * ORB.speed * 0.9,
            vy: Math.sin(a) * ORB.speed * 0.9,
            radius: ORB.radius,
            life: ORB.life,
          });
        }
        state.fx.push({ type: 'burst', x: enemy.x, y: enemy.y });
      }
      enemy.summonCd -= dt;
      if (enemy.summonCd <= 0 && state.enemies.length < 14) {
        enemy.summonCd = 8;
        for (let i = 0; i < 3; i += 1) {
          const at = edgePoint(random, player);
          state.enemies.push(makeEnemy(KIND_CRAWLER, at.x, at.y, state.wave));
        }
        state.fx.push({ type: 'summon', x: enemy.x, y: enemy.y });
      }
    }
    enemy.x = Math.max(enemy.radius, Math.min(FIELD.width - enemy.radius, enemy.x));
    enemy.y = Math.max(enemy.radius, Math.min(FIELD.height - enemy.radius, enemy.y));
  }

  function step(dt, move, firing, aim) {
    if (state.over || state.won) return 0;
    let events = 0;
    const player = state.player;
    state.time += dt;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 40);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 2.5);
    if (player.invuln > 0) player.invuln -= dt;
    if (player.prism > 0) player.prism -= dt;

    // The lantern burns whether you move or not.
    player.fuel -= PLAYER.fuelDrain * dt;
    if (player.fuel <= 0) {
      player.fuel = 0;
      state.over = true;
      state.overReason = 'dark';
      state.fx.push({ type: 'over' });
      return events | EVENT_OVER;
    }

    // Movement.
    player.x = Math.max(player.radius, Math.min(FIELD.width - player.radius, player.x + move.x * PLAYER.speed * dt));
    player.y = Math.max(player.radius, Math.min(FIELD.height - player.radius, player.y + move.y * PLAYER.speed * dt));

    // Firing.
    player.fireCd -= dt;
    if (firing && player.fireCd <= 0) {
      player.fireCd = 1 / PLAYER.fireRate;
      fireBolt(aim);
    }

    // Waves.
    if (state.waveState === 'breather') {
      state.waveTimer -= dt;
      if (state.waveTimer <= 0) startWave(state.wave + 1);
    } else if (state.waveState === 'active') {
      if (state.spawnQueue.length > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          // From wave 4 the dark sends its shadows in pairs, so the field fills
          // faster than one bolt at a time can clear it.
          const batch = state.wave >= 4 ? 2 : 1;
          const interval = Math.max(WAVE.minSpawnInterval, WAVE.spawnInterval - WAVE.spawnIntervalPerWave * state.wave);
          state.spawnTimer = interval * (batch === 2 ? 1.5 : 1);
          for (let n = 0; n < batch && state.spawnQueue.length > 0; n += 1) {
            const kind = state.spawnQueue.shift();
            const at = edgePoint(random, player);
            const enemy = makeEnemy(kind, at.x, at.y, state.wave);
            state.enemies.push(enemy);
            if (kind === KIND_BOSS) {
              state.boss = enemy;
              events |= EVENT_BOSS;
            }
            state.fx.push({ type: 'spawn', x: at.x, y: at.y, kind });
          }
        }
      } else if (state.enemies.length === 0) {
        const bonus = WAVE.clearBonusPerWave * state.wave;
        state.score += bonus;
        state.waveState = 'breather';
        state.waveTimer = WAVE.breatherSeconds;
        state.banner = `WAVE ${state.wave} CLEARED  +${bonus}`;
        state.bannerTimer = 2;
        events |= EVENT_WAVE_CLEAR;
      }
    }

    // Bolts.
    for (let i = state.bolts.length - 1; i >= 0; i -= 1) {
      const bolt = state.bolts[i];
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0 || bolt.x < -40 || bolt.x > FIELD.width + 40 || bolt.y < -40 || bolt.y > FIELD.height + 40) {
        state.bolts.splice(i, 1);
        continue;
      }
      for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
        const enemy = state.enemies[j];
        const dx = bolt.x - enemy.x;
        const dy = bolt.y - enemy.y;
        const rr = bolt.radius + enemy.radius;
        if (dx * dx + dy * dy < rr * rr) {
          state.bolts.splice(i, 1);
          state.shotsHit += 1;
          enemy.hp -= bolt.damage;
          state.fx.push({ type: 'hit', x: bolt.x, y: bolt.y });
          if (enemy.hp <= 0) killEnemy(j);
          break;
        }
      }
    }
    if (state.won) return events | EVENT_WIN;

    // Enemies move, then touch the player.
    for (let i = 0; i < state.enemies.length; i += 1) stepEnemy(state.enemies[i], dt);
    for (let i = 0; i < state.enemies.length; i += 1) {
      for (let j = i + 1; j < state.enemies.length; j += 1) {
        const a = state.enemies[i];
        const b = state.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.01 && d2 < rr * rr) {
          const d = Math.sqrt(d2);
          const push = ((rr - d) / d) * 0.5;
          a.x -= dx * push;
          a.y -= dy * push;
          b.x += dx * push;
          b.y += dy * push;
        }
      }
    }
    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const rr = enemy.radius + player.radius - 2;
      if (dx * dx + dy * dy < rr * rr) {
        hurtPlayer();
        // Shove the enemy back so one touch is one hit.
        const d = Math.hypot(dx, dy) || 1;
        enemy.x = player.x + (dx / d) * rr;
        enemy.y = player.y + (dy / d) * rr;
        if (state.over) return events | EVENT_OVER;
        break;
      }
    }

    // Shadow orbs.
    for (let i = state.orbs.length - 1; i >= 0; i -= 1) {
      const orb = state.orbs[i];
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.life -= dt;
      if (orb.life <= 0 || orb.x < -30 || orb.x > FIELD.width + 30 || orb.y < -30 || orb.y > FIELD.height + 30) {
        state.orbs.splice(i, 1);
        continue;
      }
      const dx = orb.x - player.x;
      const dy = orb.y - player.y;
      const rr = orb.radius + player.radius - 2;
      if (dx * dx + dy * dy < rr * rr) {
        state.orbs.splice(i, 1);
        hurtPlayer();
        if (state.over) return events | EVENT_OVER;
      }
    }

    // Pickups: drift, magnetise, expire, collect.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = state.pickups[i];
      pickup.t += dt;
      pickup.life -= dt;
      if (pickup.life <= 0) {
        state.pickups.splice(i, 1);
        continue;
      }
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const dist = Math.hypot(dx, dy);
      if (dist < PICKUP.magnetRadius) {
        pickup.x += (dx / (dist || 1)) * 260 * dt;
        pickup.y += (dy / (dist || 1)) * 260 * dt;
      }
      if (dist < player.radius + 14) {
        state.pickups.splice(i, 1);
        if (pickup.kind === 'ember') {
          player.fuel = Math.min(player.maxFuel, player.fuel + PICKUP.emberFuel);
          state.fx.push({ type: 'ember', x: pickup.x, y: pickup.y });
        } else if (pickup.kind === 'heart') {
          player.hp = Math.min(player.maxHp, player.hp + 1);
          state.fx.push({ type: 'heart', x: pickup.x, y: pickup.y });
        } else {
          player.prism = PICKUP.prismSeconds;
          state.fx.push({ type: 'prism', x: pickup.x, y: pickup.y });
        }
      }
    }
    return events;
  }

  /** The title screen's living backdrop: shadows drift and embers rise, no player. */
  function stepAmbient(dt, random) {
    state.time += dt;
    if (state.enemies.length < 6 && random.next() < dt * 0.5) {
      const kind = random.pick([KIND_CRAWLER, KIND_WRAITH]);
      state.enemies.push(makeEnemy(kind, random.range(60, FIELD.width - 60), random.range(60, FIELD.height - 60), 1));
    }
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.t += dt;
      enemy.x += Math.sin(enemy.t * 0.4 + enemy.phase) * 14 * dt;
      enemy.y += Math.cos(enemy.t * 0.3 + enemy.phase) * 10 * dt;
      if (random.next() < dt * 0.02) state.enemies.splice(i, 1);
    }
    if (random.next() < dt * 2) {
      state.fx.push({ type: 'mote', x: random.range(40, FIELD.width - 40), y: FIELD.height - 10 });
    }
  }

  reset();
  return { state, reset, step, stepAmbient, startWave, random, kinds: KINDS };
}
