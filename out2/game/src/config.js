// Emberward — every tuning number and colour in one place. The playfield is a fixed
// 1280x720 logical area; the renderer scales it to the window, so no rule below depends
// on the screen size. The game is a dark-gothic arena survival shooter: the Warden's
// lantern is the light, the fuel and the weapon all at once.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 265,
  maxHp: 4,
  /** Seconds of mercy after taking a hit. */
  invulnerable: 1.5,
  /** Lantern fuel. Drains over time; embers refill it. At zero, the dark takes you. */
  maxFuel: 100,
  fuelDrain: 1.2,
  /** Light radius at full fuel and at empty fuel. */
  glowFull: 330,
  glowEmpty: 120,
  /** Bolts per second while firing. */
  fireRate: 7,
  boltSpeed: 660,
  boltRadius: 5,
  boltDamage: 1,
  boltLife: 1.1,
};

export const BOLT = { speed: 660, radius: 5, damage: 1, life: 1.1 };

export const ENEMY = {
  crawler: { radius: 15, hp: 1, speed: 82, score: 10, touch: 1 },
  wraith: { radius: 14, hp: 2, speed: 135, score: 25, touch: 1 },
  spitter: { radius: 16, hp: 2, speed: 62, score: 40, touch: 1 },
  dreadlord: { radius: 46, hp: 36, speed: 56, score: 500, touch: 1 },
};

/** Shadow orbs the spitter and the Dreadlord fire. */
export const ORB = { speed: 190, radius: 7, life: 5 };

export const PICKUP = {
  emberFuel: 22,
  emberChance: 0.45,
  heartChance: 0.08,
  prismChance: 0.08,
  /** Seconds the prism's three-way shot lasts. */
  prismSeconds: 8,
  magnetRadius: 110,
  lifeSeconds: 12,
};

/** Wave N fields 4 + 3N shadows. Wraiths join from wave 2, spitters from wave 3. */
export const WAVE = {
  baseCount: 4,
  perWave: 3,
  spawnInterval: 0.85,
  spawnIntervalPerWave: 0.05,
  minSpawnInterval: 0.32,
  /** Seconds between waves, while the banner shows. */
  breatherSeconds: 2.5,
  /** The Dreadlord arrives on this wave; killing it wins the game. */
  bossWave: 10,
  clearBonusPerWave: 50,
};

export const PALETTE = {
  backdrop: '#07060f',
  floor: '#0d0b1a',
  rune: '#241d45',
  text: '#f3ead8',
  muted: '#9a8fc0',
  ember: '#ffb347',
  emberHot: '#ff7b2f',
  lantern: '#ffd98a',
  bolt: '#ffe9a8',
  heart: '#ff5d73',
  prism: '#7fe7ff',
  wraith: '#b9a7ff',
  spitter: '#8fff9e',
  crawler: '#7d6bb0',
  boss: '#ff4d6d',
  panel: '#171226',
  panelEdge: '#3a2d63',
};

export const FONT = 'Georgia, "Times New Roman", serif';
export const FONT_UI = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberward.best';
