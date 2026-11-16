// Render Emberward's 4 screenshot scenes in headless Chrome via CDP (Node stdlib
// only: fetch + global WebSocket). The game is loaded from its own files via
// file:// (with --allow-file-access-from-files so its ES modules load) — no
// server, so Chrome's Local Network Access check never fires. Waits for
// window.__shotReady, then captures a JPEG at 1280x720. Writes to ./screenshots/.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const GAME_DIR = new URL('./game/', import.meta.url).pathname;
const SHOTS = JSON.parse(readFileSync(new URL('./shots.json', import.meta.url), 'utf8'));
const CHROME = '/opt/meta-chromium/chrome';
const PORT = 9222;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  const { spawn } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  // The Hatch Chromium build requires the measured WebGL domain policy at
  // startup: the immutable image policy file plus its SHA-256.
  const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const policy = readFileSync(policyPath);
  const policySha = createHash('sha256').update(policy).digest('hex');
  const chrome = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    '--hide-scrollbars',
    '--window-size=1280,720',
    `--hatch-webgl-allowed-domains-file=${policyPath}`,
    `--hatch-webgl-allowed-domains-sha256=${policySha}`,
    '--allow-file-access-from-files',
    '--user-data-dir=/tmp/emberward-chrome-profile',
    'about:blank',
  ], { stdio: 'ignore' });
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return chrome;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('chrome did not start');
}

let msgId = 0;
const pending = new Map();
function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

/** Evaluate JS in the page and return its value (CDP nests it two deep). */
async function evaluate(ws, expression) {
  const msg = await send(ws, 'Runtime.evaluate', { expression, returnByValue: true });
  return msg?.result?.result?.value;
}

async function shoot(ws, shot) {
  await send(ws, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send(ws, 'Page.enable');
  await send(ws, 'Page.navigate', { url: `file://${GAME_DIR}index.html${shot.query}` });
  // Wait for the scene to stage and paint (window.__shotReady).
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    if (await evaluate(ws, 'window.__shotReady === true')) {
      ready = true;
      break;
    }
    await sleep(200);
  }
  if (!ready) throw new Error(`shot ${shot.name} never became ready`);
  const shotError = await evaluate(ws, 'window.__shotError || null');
  if (shotError) throw new Error(`page error on ${shot.name}: ${shotError}`);
  const msg = await send(ws, 'Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  return Buffer.from(msg.result.data, 'base64');
}

const chrome = await launchChrome();
try {
  const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id).resolve(msg);
      pending.delete(msg.id);
    }
  };
  await send(ws, 'Runtime.enable');
  mkdirSync(new URL('./screenshots', import.meta.url), { recursive: true });
  for (const shot of SHOTS) {
    const t0 = Date.now();
    const buf = await shoot(ws, shot);
    const path = new URL(`./screenshots/${shot.name}`, import.meta.url);
    writeFileSync(path, buf);
    console.log(`${shot.name}  ${buf.length} bytes  (${Date.now() - t0}ms)  ${shot.query}`);
  }
  ws.close();
} finally {
  chrome.kill();
}
console.log('done');
