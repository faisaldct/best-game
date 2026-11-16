// One pool of short-lived sparks, embers and wisps, allocated once at boot and
// reused: no allocation while the game runs. A particle is a point with a velocity,
// a lifetime, a size, a colour and a kind (spark, mote, ring, wisp).

export function createParticles(capacity) {
  const items = [];
  for (let i = 0; i < capacity; i += 1) {
    items.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#ffffff', kind: 'spark', drag: 1 });
  }
  let cursor = 0;

  function spawn(x, y, vx, vy, life, size, color, kind) {
    const p = items[cursor];
    cursor = (cursor + 1) % items.length;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.kind = kind;
    p.drag = kind === 'mote' ? 1 : 0.94;
  }

  return {
    items,
    /** A burst of sparks flying out from a point. */
    burst(x, y, count, color, speed, life, size) {
      for (let i = 0; i < count; i += 1) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.3 + Math.random() * 0.7);
        spawn(x, y, Math.cos(angle) * v, Math.sin(angle) * v, life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.8), color, 'spark');
      }
    },
    /** An expanding ring (a shockwave). */
    ring(x, y, color, size) {
      spawn(x, y, 0, 0, 0.45, size, color, 'ring');
    },
    /** A slow ember mote drifting upward, for the title screen's atmosphere. */
    mote(x, y, color) {
      spawn(x, y, (Math.random() - 0.5) * 12, -14 - Math.random() * 22, 3 + Math.random() * 3, 1.5 + Math.random() * 2, color, 'mote');
    },
    /** A fading wisp where a shadow dies. */
    wisp(x, y, color) {
      spawn(x, y, 0, -26, 0.8, 10 + Math.random() * 8, color, 'wisp');
    },
    step(dt) {
      for (let i = 0; i < items.length; i += 1) {
        const p = items[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        if (p.kind === 'mote') p.vy -= 6 * dt;
      }
    },
    clear() {
      for (let i = 0; i < items.length; i += 1) items[i].active = false;
    },
  };
}
