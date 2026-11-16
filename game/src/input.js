// Keyboard and mouse, read as the game's own actions. Movement keys are held; the
// confirm, pause, mute and restart keys are edge-triggered, so one press is one action.
// Mouse coordinates are converted to the game's logical 1280x720 field.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

const ACTION_KEYS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  KeyR: ACTION_RESTART,
};

export function createInput(canvas) {
  const held = { up: false, down: false, left: false, right: false };
  const pressed = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2 - 120, down: false };
  let spaceHeld = false;

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    mouse.x = (event.clientX - rect.left) * scaleX;
    mouse.y = (event.clientY - rect.top) * scaleY;
  }

  function onKeyDown(event) {
    const move = MOVE_KEYS[event.code];
    if (move) {
      held[move] = true;
      event.preventDefault();
      return;
    }
    const action = ACTION_KEYS[event.code];
    if (action) {
      pressed.add(action);
      if (event.code === 'Space') {
        spaceHeld = true;
        event.preventDefault();
      }
    }
  }

  function onKeyUp(event) {
    const move = MOVE_KEYS[event.code];
    if (move) held[move] = false;
    if (event.code === 'Space') spaceHeld = false;
  }

  function onMouseMove(event) {
    toLogical(event);
  }

  function onMouseDown(event) {
    toLogical(event);
    mouse.down = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  function onBlur() {
    held.up = held.down = held.left = held.right = false;
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return {
    /** Normalised movement direction from the held keys, or { x: 0, y: 0 }. */
    move() {
      const x = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      const y = (held.down ? 1 : 0) - (held.up ? 1 : 0);
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    mouse,
    /** True while the mouse button or Space is held (firing). */
    firing() {
      return mouse.down || spaceHeld;
    },
    /** True once for each press of the named action; clears when read. */
    consume(action) {
      if (!pressed.has(action)) return false;
      pressed.delete(action);
      return true;
    },
    /** Clear any actions pressed while another screen was up. */
    clear() {
      pressed.clear();
    },
  };
}
