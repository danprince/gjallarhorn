// @ts-check

import { spritesheet } from "./sprites.js";

/**
 * @import { Sprite } from "./sprites.js";
 */

/**
 * @typedef {object} Point
 * @prop {number} x
 * @prop {number} y
 *
 * @typedef {object} Vector
 * @prop {number} x
 * @prop {number} y
 *
 * @typedef {object} Rectangle
 * @prop {number} x
 * @prop {number} y
 * @prop {number} w
 * @prop {number} h
 *
 * @typedef {object} Zone
 * @prop {Slot[]} slots
 * @prop {Rectangle} hb
 * @prop {number} cols
 * @prop {number} rows
 *
 * @typedef {object} Slot
 * @prop {Zone} zone
 * @prop {number} x
 * @prop {number} y
 * @prop {Rectangle} hb
 * @prop {Card} [card]
 *
 * @typedef {object} Card
 * @prop {CardType} type
 * @prop {number} hp
 * @prop {number} tags
 * @prop {string} name
 * @prop {string} description
 * @prop {Sprite} sprite
 * @prop {Rectangle} hb
 * @prop {Slot} slot
 *
 * @typedef {object} Timer
 * @prop {number} duration
 * @prop {number} elapsed
 * @prop {(t: number) => void} callback
 *
 * @typedef {object} Animation
 * @prop {Point} start
 * @prop {Point} end
 * @prop {number} duration
 * @prop {number} elapsed
 *
 * @typedef {object} Drag
 * @prop {Card} card
 * @prop {Vector} offset
 */

const UI_W = 320;
const UI_H = 200;
const UI_CENTER_X = UI_W / 2;
const UI_CENTER_Y = UI_H / 2;
const UI_CARD_SIZE = 18;
const UI_CELL_SIZE = 20;
const UI_GAP = 10;
const UI_CARD_ANIMATION_MS = 250;
const UI_BG = "#11151c";

const UI_BOARD_COLS = 4;
const UI_BOARD_ROWS = 4;
const UI_BOARD_W = UI_BOARD_COLS * UI_CELL_SIZE;
const UI_BOARD_H = UI_BOARD_ROWS * UI_CELL_SIZE;
const UI_BOARD_X = UI_CENTER_X - UI_BOARD_W / 2;
const UI_BOARD_Y = UI_CENTER_Y - UI_BOARD_H / 2;

const UI_GRAVE_COLS = 4;
const UI_GRAVE_ROWS = 1;
const UI_GRAVE_W = UI_GRAVE_COLS * UI_CELL_SIZE;
const UI_GRAVE_H = UI_GRAVE_ROWS * UI_CELL_SIZE;
const UI_GRAVE_X = UI_CENTER_X - UI_GRAVE_W / 2;
const UI_GRAVE_Y = UI_BOARD_Y - UI_GAP - UI_GRAVE_H;

const UI_HAND_COLS = 4;
const UI_HAND_ROWS = 1;
const UI_HAND_W = UI_HAND_COLS * UI_CELL_SIZE;
const UI_HAND_H = UI_HAND_ROWS * UI_CELL_SIZE;
const UI_HAND_X = UI_CENTER_X - UI_HAND_W / 2;
const UI_HAND_Y = UI_BOARD_Y + UI_BOARD_H + UI_GAP;

const UI_BUTTON_ANCHOR_X = UI_CENTER_X;
const UI_BUTTON_ANCHOR_Y = UI_GRAVE_Y + UI_GRAVE_H + UI_GAP;
const UI_CARD_SPRITES = strip(spritesheet.cards, UI_CARD_SIZE, UI_CARD_SIZE);

let sprites = new Image();
sprites.src = "sprites.png";
await sprites.decode();

let canvas = document.createElement("canvas");
let ctx = required(canvas.getContext("2d"));
let pointer = { x: 0, y: 0 }; // pointer position in canvas coords
let down = false; // pointer is down
let _down = false; // pointer was down
let pressed = false; // pointer was pressed this frame
let released = false; // pointer was released this frame
let refresh = true; // need to redraw this frame
let pt = performance.now(); // previous (frame) time
let dt = 0; // delta since previous frame

// [Input]
const BUTTON_LMB = 1;

// [Tags]
const NONE = 0;
const ALL = ~0;
const GOD = 1;
const GIANT = 2;

// [Cards]
const HEIMDALL = 1;
const ODIN = 2;
const THOR = 3;
const HEL = 4;
const TYR = 5;
const FRIGG = 6;
const LOKI = 7;
const CRYSTAL = 8;
const FROST_GIANT = 9;

/**
 * @typedef {(
 *   | typeof HEIMDALL
 *   | typeof ODIN
 *   | typeof THOR
 *   | typeof HEL
 *   | typeof TYR
 *   | typeof FRIGG
 *   | typeof LOKI
 *   | typeof CRYSTAL
 *   | typeof FROST_GIANT
 * )} CardType
 */

/**
 * @type {Record<CardType, [hp: number, tags: number, name: string, description: string]>}
 */
// prettier-ignore
const CARDS = {
  //             hp  tags   name        description
  [HEIMDALL]:    [1, GOD,   "Heimdall", ""],
  [ODIN]:        [2, GOD,   "Odin",     ""],
  [THOR]:        [2, GOD,   "Thor",     ""],
  [HEL]:         [1, GOD,   "Hel",      ""],
  [TYR]:         [3, GOD,   "Tyr",      ""],
  [FRIGG]:       [1, GOD,   "Frigg",    ""],
  [LOKI]:        [1, GOD,   "Loki",     ""],
  [CRYSTAL]:     [0, NONE,  "Crystal",  ""],
  [FROST_GIANT]: [1, GIANT, "Giant",    ""],
};

/**
 * @type {Set<Card>}
 */
let cards = new Set();

/**
 * @type {Drag | undefined}
 */
let drag;

let hand = Zone(UI_HAND_X, UI_HAND_Y, UI_HAND_COLS, UI_HAND_ROWS);
let board = Zone(UI_BOARD_X, UI_BOARD_Y, UI_BOARD_COLS, UI_BOARD_ROWS);
let grave = Zone(UI_GRAVE_X, UI_GRAVE_Y, UI_GRAVE_COLS, UI_GRAVE_ROWS);

/**
 * Creates a rectangle.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {Rectangle}
 */
function Rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Subtract `b` from `a` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Returns `value` if it is non-nullable, otherwise throws an error.
 *
 * Useful as an alternative to the non-null assertion operator (!) which
 * actually throws instead of just failing silently.
 *
 * @template Value
 * @param {Value} value
 * @returns {NonNullable<Value>}
 */
function required(value) {
  if (value == null) throw required;
  return value;
}

/**
 * Check whether a rectangle contains a specific point.
 * @param {Rectangle} r
 * @param {Point} p
 * @returns {boolean}
 */
function inside(r, p) {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
}

/**
 * @param {Rectangle} r
 */
function hover(r) {
  return inside(r, pointer);
}

/**
 * Remove the first instance of an item from an array.
 * @template Value
 * @param {Value[]} array
 * @param {Value} item
 */
function remove(array, item) {
  let index = array.indexOf(item);
  if (index >= 0) array.splice(index, 1);
}

/**
 * Linear interpolation between two values.
 * @param {number} a The start value.
 * @param {number} b The end value.
 * @param {number} k The control value.
 * @returns {number} The interpolated value.
 */
function lerp(a, b, k) {
  return a + (b - a) * k;
}

/**
 * @param {number} t
 * @returns {number}
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * @param {number} t
 * @returns {number}
 */
function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Slice a rectangle into a strip of sub-rectangles. Useful for creating
 * sprites from a parent sprite.
 * @param {Rectangle} rect
 * @param {number} w
 * @param {number} h
 */
function strip(rect, w = rect.h, h = rect.h) {
  /** @type {Rectangle[]} */
  let slices = [];

  for (let y = 0; y < rect.h; y += h) {
    for (let x = 0; x < rect.w; x += w) {
      slices.push({ x: rect.x + x, y: rect.y + y, w, h });
    }
  }

  return slices;
}

/**
 * @type {Set<Timer>}
 */
let timers = new Set();

/**
 * @param {number} ms
 * @param {(t: number) => void} callback
 */
function timer(ms, callback) {
  timers.add({ elapsed: 0, duration: ms, callback });
}

/**
 * @type {Record<string, HTMLCanvasElement>}
 */
let _recolors = {};

/**
 * @param {string} color
 * @returns {HTMLCanvasElement}
 */
function recolor(color) {
  let c = _recolors[color];
  if (c) return c;

  c = _recolors[color] = document.createElement("canvas");
  c.width = sprites.width;
  c.height = sprites.height;

  let ctx = required(c.getContext("2d"));
  ctx.drawImage(sprites, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);

  return c;
}

/**
 * Render a sprite.
 * @param {Sprite} s
 * @param {number} x
 * @param {number} y
 * @param {string} [tint]
 */
function draw(s, x, y, tint) {
  let { x: sx, y: sy, w: sw, h: sh } = s;
  let source = tint ? recolor(tint) : sprites;
  ctx.drawImage(source, sx, sy, sw, sh, x | 0, y | 0, sw, sh);
}

/**
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} [color]
 */
function write(text, x, y, color) {
  let src = spritesheet.font;
  let cols = 16; // cols in glyph atlas
  let start = 32; // starting glyph
  let gw = 3; // glyph width
  let gh = 5; // glyph height
  let lh = 6; // line height
  let ls = 4; // letter spacing
  let dx = x; // destination x
  let dy = y; // destination y
  let g = Rect(0, 0, gw, gh);

  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i) - start;
    let newline = c < 0; // c === (10-start)

    if (newline) {
      dx = x;
      dy += lh;
    } else {
      g.x = src.x + (c % cols) * gw;
      g.y = src.y + ((c / cols) | 0) * gh;
      draw(g, dx + 1, dy, UI_BG);
      draw(g, dx, dy + 1, UI_BG);
      draw(g, dx, dy, color);
      dx += ls;
    }
  }
}

function resize() {
  let s = Math.min(innerWidth / UI_W, innerHeight / UI_H);
  canvas.style.cssText = `position:fixed;inset:0;image-rendering:pixelated;width:${UI_W * s}px;height:${UI_H * s}px`;
}

/**
 * @param {PointerEvent} event
 */
function onPointerEvent({ buttons, clientX: x, clientY: y }) {
  let scale = canvas.width / canvas.clientWidth;
  pointer.x = (x * scale) | 0;
  pointer.y = (y * scale) | 0;
  down = buttons === BUTTON_LMB;
  pressed = down && !_down;
  released = _down && !down;
  refresh = true;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cols
 * @param {number} rows
 * @returns {Zone}
 */
function Zone(x, y, cols, rows) {
  let s = UI_CELL_SIZE;
  let hb = Rect(x, y, cols * s, rows * s);

  /**
   * @type {Zone}
   */
  let zone = { slots: [], hb, cols, rows };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let hb = Rect(x + col * s, y + row * s, s, s);
      zone.slots.push({ zone, x: col, y: row, hb });
    }
  }

  return zone;
}

/**
 * @param {CardType} type
 * @param {Slot} slot
 * @param {number} [hp]
 */
function spawn(type, slot, hp) {
  let def = CARDS[type];
  let sprite = UI_CARD_SPRITES[type];
  let card = (slot.card = {
    type,
    hp: hp ?? def[0],
    tags: def[1],
    name: def[2],
    description: def[3],
    sprite: UI_CARD_SPRITES[type],
    hb: Rect(slot.hb.x, slot.hb.y, sprite.w, sprite.h),
    slot,
  });
  cards.add(card);
}

/**
 * @param {Card} card
 */
function despawn(card) {
  card.slot.card = undefined;
  cards.delete(card);
}

/**
 * @param {Card} card
 * @param {Slot} slot
 */
function play(card, slot) {
  card.slot.card = undefined;
  card.slot = slot;
  slot.card = card;
  card.hb.x = slot.hb.x;
  card.hb.y = slot.hb.y;
}

/**
 * Animate a card to
 * @param {Card} card
 * @param {Slot} slot
 */
function tween(card, slot) {
  let { x: x0, y: y0 } = card.hb;
  let { x: x1, y: y1 } = slot.hb;

  timer(UI_CARD_ANIMATION_MS, (t) => {
    let k = smoothstep(t);
    card.hb.x = lerp(x0, x1, k);
    card.hb.y = lerp(y0, y1, k);
  });
}

/**
 * @param {Zone} zone
 */
function renderZone(zone) {
  for (let slot of zone.slots) {
    draw(spritesheet.card_slot, slot.hb.x, slot.hb.y);
    if (slot.card && slot.card !== drag?.card) {
      renderCard(slot.card);
    }
  }
}

/**
 * @param {Card} card
 */
function renderCard(card) {
  let { x, y } = card.hb;
  draw(card.sprite, x, y);
  write(`${card.hp}`, x + 8, y + 13);
}

function render() {
  ctx.clearRect(0, 0, UI_W, UI_H);
  renderZone(grave);
  renderZone(board);
  renderZone(hand);
  if (drag) renderCard(drag.card);
}

function updateTimers() {
  for (let timer of timers) {
    timer.elapsed += dt;
    let t = Math.min(1, timer.elapsed / timer.duration);
    timer.callback(t);
    if (t === 1) timers.delete(timer);
    refresh = true;
  }
}

function updateDrag() {
  if (drag) {
    let { card, offset } = drag;
    let slot = board.slots.find((s) => hover(s.hb));

    if (released && slot && !slot.card) {
      play(card, slot);
    } else if (released) {
      tween(card, card.slot);
    } else if (slot && !slot.card) {
      // Snap to slot
      card.hb.x = slot.hb.x;
      card.hb.y = slot.hb.y;
    } else {
      card.hb.x = pointer.x - offset.x;
      card.hb.y = pointer.y - offset.y;
    }
  } else if (pressed) {
    for (let { card } of hand.slots) {
      if (card && hover(card.hb)) {
        let offset = sub(pointer, card.hb);
        drag = { card, offset };
      }
    }
  }

  if (released) {
    drag = undefined;
  }
}

function update() {
  updateTimers();
  updateDrag();
}

function loop(now = pt) {
  requestAnimationFrame(loop);

  pt ||= now;
  dt = now - pt;
  pt = now;

  update();

  refresh && render();
  refresh = false;

  pressed = false;
  released = false;
  _down = down;
}

function init() {
  spawn(HEIMDALL, hand.slots[0]);
  spawn(THOR, hand.slots[1]);

  canvas.width = UI_W;
  canvas.height = UI_H;

  onpointerdown = onpointermove = onpointerup = onPointerEvent;
  onresize = resize;

  document.title = "Gjallarhorn";
  document.body.style.cssText = `background:${UI_BG}`;
  document.body.append(canvas);

  resize();
  loop();
}

init();
