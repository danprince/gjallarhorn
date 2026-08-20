import { blit, canvas, ctx, draw, pswap, write } from "./graphics.js";
import { spritesheet } from "./sprites.js";
import {
  add,
  cardinals,
  diagonals,
  exists,
  inside,
  lerp,
  range,
  Rect,
  required,
  smoothstep,
  strip,
  sub,
} from "./utils.js";

/**
 * @import { Sprite } from "./sprites.js";
 * @import { Point, Rectangle, Vector } from "./utils.js";
 */

/**
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
 * @prop {number} palette
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
 * @prop {number} palette
 * @prop {Rectangle} hb
 * @prop {Slot} slot
 * @prop {number} targets
 * @prop {Vector[]} adjacency
 * @prop {number} flashTimer
 * @prop {(card: Card, targets: Card[]) => void} effect
 *
 * @typedef {object} CardDefinition
 * @prop {number} [hp]
 * @prop {number} [tags]
 * @prop {string} name
 * @prop {string} [description]
 * @prop {number} [sprite]
 * @prop {number} [palette]
 * @prop {number} [targets]
 * @prop {Vector[]} [adjacency]
 * @prop {(card: Card, targets: Card[]) => void} [effect]
 *
 * @typedef {object} Timer
 * @prop {number} duration
 * @prop {number} elapsed
 * @prop {(t: number) => void} callback
 * @prop {() => void} done
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
 *
 * @typedef {object} Button
 * @prop {string} label
 * @prop {number} x
 * @prop {number} y
 * @prop {number} w
 * @prop {number} h
 * @prop {boolean} active
 * @prop {boolean} pressed
 */

const UI_W = 320;
const UI_H = 200;
const UI_CENTER_X = UI_W / 2;
const UI_CENTER_Y = UI_H / 2;
const UI_CARD_SIZE = 18;
const UI_CELL_SIZE = 20;
const UI_GAP = 10;
const UI_CARD_ANIMATION_MS = 250;
const UI_ATTACK_MS = 150;
const UI_BG = "#11151c";

const UI_BOARD_COLS = 4;
const UI_BOARD_ROWS = 4;
const UI_BOARD_W = UI_BOARD_COLS * UI_CELL_SIZE;
const UI_BOARD_H = UI_BOARD_ROWS * UI_CELL_SIZE;
const UI_BOARD_X = UI_CENTER_X - UI_BOARD_W / 2;
const UI_BOARD_Y = UI_CENTER_Y - UI_BOARD_H / 2;

const UI_GRAVE_COLS = 5;
const UI_GRAVE_ROWS = 1;
const UI_GRAVE_W = UI_GRAVE_COLS * UI_CELL_SIZE;
const UI_GRAVE_H = UI_GRAVE_ROWS * UI_CELL_SIZE;
const UI_GRAVE_X = UI_CENTER_X - UI_GRAVE_W / 2;
const UI_GRAVE_Y = UI_BOARD_Y - UI_GAP - UI_GRAVE_H;

const UI_HAND_COLS = 7;
const UI_HAND_ROWS = 1;
const UI_HAND_W = UI_HAND_COLS * UI_CELL_SIZE;
const UI_HAND_H = UI_HAND_ROWS * UI_CELL_SIZE;
const UI_HAND_X = UI_CENTER_X - UI_HAND_W / 2;
const UI_HAND_Y = UI_BOARD_Y + UI_BOARD_H + UI_GAP;

const UI_BUTTON_ANCHOR_X = UI_CENTER_X;
const UI_BUTTON_ANCHOR_Y = UI_HAND_Y + UI_HAND_H + UI_GAP;
const UI_CARD_SPRITES = strip(spritesheet.cards, UI_CARD_SIZE, UI_CARD_SIZE);
const UI_CURSOR_SPRITES = strip(spritesheet.cursors, 9);
const UI_CURSOR_PIVOT_X = spritesheet.cursors.pivot.x;
const UI_CURSOR_PIVOT_Y = spritesheet.cursors.pivot.y;

const CURSOR_DEFAULT = 0;
const CURSOR_POINTER = 1;
const CURSOR_GRAB = 2;
const CURSOR_GRABBING = 3;

let pointer = { x: UI_W, y: UI_H }; // pointer position in canvas coords
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
const CRYSTAL = 4;

// [Cards]
const HEIMDALL = 1;
const ODIN = 2;
const THOR = 3;
const HEL = 4;
const TYR = 5;
const FRIGG = 6;
const LOKI = 7;
const FROST_CRYSTAL = 8;
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
 *   | typeof FROST_CRYSTAL
 *   | typeof FROST_GIANT
 * )} CardType
 */

/**
 * @type {Record<CardType, CardDefinition>}
 */
const CARDS = {
  [HEIMDALL]: {
    name: "Heimdall",
    targets: GOD | GIANT,
    effect(card, targets) {
      for (let target of targets) {
        if (is(target, GOD)) queue({ type: SUMMON, card: target });
        if (is(target, GIANT)) queue({ type: ATTACK, card, target });
      }
    },
  },
  [ODIN]: { name: "Odin", hp: 2 },
  [THOR]: {
    name: "Thor",
    targets: GIANT | CRYSTAL,
  },
  [HEL]: { name: "Hel" },
  [TYR]: {
    name: "Tyr",
    hp: 3,
    targets: GOD | GIANT,
    effect(card, targets) {
      for (let target of targets) {
        if (is(target, GIANT)) queue({ type: ATTACK, card, target });
        queue({ type: PUSH, card, target });
      }
    },
  },
  [FRIGG]: { name: "Frigg", adjacency: diagonals },
  [LOKI]: { name: "Loki" },
  [FROST_CRYSTAL]: {
    hp: 0,
    name: "Crystal",
    tags: CRYSTAL,
    targets: NONE,
  },
  [FROST_GIANT]: { hp: 1, tags: GIANT, name: "Giant", targets: GOD },
};

const ATTACK = 0;
const SUMMON = 1;
const DIE = 2;
const PUSH = 3;
const TRIGGER = 4;

/**
 * @typedef {{ type: typeof ATTACK, card: Card, target: Card }} Attack
 * @typedef {{ type: typeof SUMMON, card: Card }} Summon
 * @typedef {{ type: typeof DIE, card: Card }} Die
 * @typedef {{ type: typeof PUSH, card: Card, target: Card }} Push
 * @typedef {{ type: typeof TRIGGER, card: Card }} Trigger
 * @typedef {Attack | Summon | Die | Push | Trigger} Action
 */

/**
 * @param {Action} action
 */
async function perform(action) {
  if (action.type === ATTACK) {
    let { card, target } = action;
    if (card.hp <= 0) return;
    await tween(card, target.slot, UI_ATTACK_MS);
    target.flashTimer = UI_ATTACK_MS;
    let dead = --target.hp <= 0;
    if (dead) queue({ type: DIE, card: target });
    if (dead && card.type === LOKI) queue({ type: SUMMON, card });
    await tween(card, card.slot, UI_ATTACK_MS);
  } else if (action.type === SUMMON) {
    let slot = hand.slots.find(isEmpty);
    if (slot) return move(action.card, slot);
  } else if (action.type === DIE) {
    let { card } = action;
    if (card.type === HEL) return resurrect(card);
    if (card.slot.zone !== board) return;
    if (is(card, CRYSTAL)) return;
    let slot = grave.slots.find(isEmpty);
    return slot ? move(card, slot) : despawn(card);
  } else if (action.type === PUSH) {
    let { card, target } = action;
    let dir = sub(target.slot, card.slot);
    let slot = at(board, add(target.slot, dir));
    if (slot) return is(target, GOD) ? play(target, slot) : move(target, slot);
  } else if (action.type === TRIGGER) {
    return trigger(action.card);
  }
}

/**
 * @param {Card} card
 */
async function resurrect(card) {
  let graveSlot = grave.slots.find(isNotEmpty) ?? grave.slots.find(isEmpty);
  let boardSlot = card.slot;
  let target = graveSlot?.card;

  if (graveSlot) {
    card.slot = graveSlot;
    await move(card, graveSlot);
  }

  if (target) {
    target.hp = 1;
    target.slot = boardSlot;
    await play(target, boardSlot);
  }
}

/**
 * @param {Action} action
 */
function queue(action) {
  actions.push(action);
}

/**
 * @type {number}
 */
let cursor = CURSOR_DEFAULT;

/**
 * @type {Button[]}
 */
let buttons = [];

/**
 * @type {Set<Timer>}
 */
let timers = new Set();

/**
 * @type {Set<Card>}
 */
let cards = new Set();

/**
 * @type {Drag | undefined}
 */
let drag;

/**
 * @type {Action[]}
 */
let actions = [];

/**
 * @type {boolean}
 */
let busy = false;

let hand = Zone(UI_HAND_X, UI_HAND_Y, UI_HAND_COLS, UI_HAND_ROWS);
let board = Zone(UI_BOARD_X, UI_BOARD_Y, UI_BOARD_COLS, UI_BOARD_ROWS);
let grave = Zone(UI_GRAVE_X, UI_GRAVE_Y, UI_GRAVE_COLS, UI_GRAVE_ROWS);

let resetButton = Button(UI_BUTTON_ANCHOR_X, UI_BUTTON_ANCHOR_Y, "RESET");

/**
 * @param {Rectangle} r
 */
function hover(r) {
  return inside(r, pointer);
}

/**
 * @param {Card} card
 * @param {number} tags
 * @returns {boolean}
 */
function is(card, tags) {
  return (card.tags & tags) > 0;
}

/**
 * @param {number} ms
 * @param {(t: number) => void} callback
 * @returns {Promise<void>}
 */
function timer(ms, callback) {
  return new Promise((done) => {
    timers.add({ elapsed: 0, duration: ms, callback, done });
  });
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
 * @param {string} label
 * @returns {Button}
 */
function Button(x, y, label) {
  let cap = spritesheet.btn.center.x;
  let w = cap + label.length * 4 + 1 + cap;
  let h = spritesheet.btn.h;
  let btn = { x, y, w, h, label, active: false, pressed: false };
  btn.x -= (w / 2) | 0;
  buttons.push(btn);
  return btn;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cols
 * @param {number} rows
 * @param {number} palette
 * @returns {Zone}
 */
function Zone(x, y, cols, rows, palette = 0) {
  let s = UI_CELL_SIZE;
  let hb = Rect(x, y, cols * s, rows * s);

  /**
   * @type {Zone}
   */
  let zone = { slots: [], hb, cols, rows };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let hb = Rect(x + col * s, y + row * s, s, s);
      zone.slots.push({ zone, x: col, y: row, hb, palette });
    }
  }

  return zone;
}

/**
 * @param {Slot} slot
 * @returns {boolean}
 */
function isEmpty(slot) {
  return slot.card === undefined;
}

/**
 * @param {Slot} slot
 * @returns {boolean}
 */
function isNotEmpty(slot) {
  return slot.card !== undefined;
}

/**
 * Reset the board.
 */
function reset() {
  for (let card of cards) {
    if (card.slot.zone !== hand) {
      let slot = hand.slots.find(isEmpty);
      if (slot) move(card, slot);
    }
  }
}

/**
 * @param {Card} card
 * @param {Card[]} targets
 */
function defaultAttackEffect(card, targets) {
  for (let target of targets) {
    queue({ type: ATTACK, card, target });
  }
}

/**
 * @param {CardType} type
 * @param {Slot} slot
 * @param {number} [hp]
 */
function spawn(type, slot, hp) {
  let def = CARDS[type];
  let sprite = UI_CARD_SPRITES[def.sprite ?? type];
  let card = (slot.card = {
    type,
    name: def.name,
    description: def.description ?? "",
    sprite,
    palette: type,
    slot,
    hb: Rect(slot.hb.x, slot.hb.y, sprite.w, sprite.h),
    flashTimer: 0,

    hp: hp ?? def.hp ?? 1,
    tags: def.tags ?? GOD,
    targets: def.targets ?? GIANT,
    effect: def.effect ?? defaultAttackEffect,
    adjacency: def.adjacency ?? cardinals,
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
async function play(card, slot) {
  await move(card, slot);
  trigger(card);

  for (let target of adjacent(card)) {
    if (is(target, GIANT)) {
      queue({ type: TRIGGER, card: target });
    }
  }
}

/**
 * @param {Card} card
 */
function trigger(card) {
  card.effect(card, adjacent(card, card.targets));
}

/**
 * @param {Card} card
 * @param {number} tags
 * @returns {Card[]}
 */
function adjacent(card, tags = ALL) {
  let { slot } = card;
  return card.adjacency
    .map((d) => add(slot, d))
    .map((p) => at(slot.zone, p)?.card)
    .filter(exists)
    .filter((c) => is(c, tags));
}

/**
 * @param {Zone} zone
 * @param {Point} p
 * @returns {Slot | undefined}
 */
function at({ slots, cols, rows }, { x, y }) {
  if (x >= 0 && y >= 0 && x < cols && y < rows) {
    return slots[x + y * cols];
  }
}

/**
 * @param {Card} card
 * @param {Slot} slot
 */
function move(card, slot) {
  card.slot.card = undefined;
  card.slot = slot;
  slot.card = card;
  return tween(card, slot);
}

/**
 * Animate a card to
 * @param {Card} card
 * @param {Slot} slot
 */
function tween(card, slot, ms = UI_CARD_ANIMATION_MS) {
  let { x: x0, y: y0 } = card.hb;
  let { x: x1, y: y1 } = slot.hb;

  return timer(ms, (t) => {
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
    draw(spritesheet.card_slot, slot.hb.x, slot.hb.y, slot.palette);
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
  let palette = card.flashTimer > 0 ? 10 : card.palette;
  draw(spritesheet.card, x, y, card.palette);
  draw(card.sprite, x, y, palette);
  if (card.hp > 0) write(`${card.hp}`, x + 8, y + 13);
}

/**
 * @param {Button} button
 */
function renderButton(button) {
  let { x, y, w, h, active } = button;
  let palette = active ? 1 : 0;
  let sprite = spritesheet.btn;
  let { x: sx, y: sy, center } = sprite;
  let { x: cap, w: cw } = center;
  if (down && active) y += 1;
  blit(sx, sy, cap, h, x, y, cap, h, palette);
  blit(sx + cap + cw, sy, cap, h, x + w, y, -cap, h, palette);
  blit(sx + cap, sy, cw, h, x + cap, y, w - cap * 2, h, palette);
  write(button.label, x + sprite.center.x + 1, y + 3);
}

function render() {
  ctx.clearRect(0, 0, UI_W, UI_H);
  renderButton(resetButton);
  renderZone(grave);
  renderZone(board);
  renderZone(hand);
  if (drag) renderCard(drag.card);
  let sprite = UI_CURSOR_SPRITES[cursor];
  draw(sprite, pointer.x - UI_CURSOR_PIVOT_X, pointer.y - UI_CURSOR_PIVOT_Y);
}

async function updateActions() {
  if (busy) return;
  let action = actions.shift();
  if (!action) return;
  busy = true;
  await perform(action);
  busy = false;
}

function updateTimers() {
  for (let timer of timers) {
    timer.elapsed += dt;
    let t = Math.min(1, timer.elapsed / timer.duration);
    timer.callback(t);
    if (t === 1) {
      timer.done();
      timers.delete(timer);
    }
    refresh = true;
  }
}

function updateButtons() {
  for (let b of buttons) {
    b.active = !drag && hover(b);
    b.pressed = pressed && b.active;
    if (b.active) cursor = CURSOR_POINTER;
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
  } else {
    for (let { card } of hand.slots) {
      if (card && hover(card.hb)) {
        if (pressed) {
          let offset = sub(pointer, card.hb);
          drag = { card, offset };
        } else {
          cursor = CURSOR_GRAB;
        }
      }
    }
  }

  if (released) drag = undefined;
  if (drag) cursor = CURSOR_GRABBING;
}

function updateCards() {
  for (let card of cards) {
    if (card.flashTimer > 0) {
      card.flashTimer -= dt;
      refresh = true;
    }
  }
}

function update() {
  cursor = CURSOR_DEFAULT;
  updateActions();
  updateTimers();
  updateDrag();
  updateButtons();
  updateCards();
  if (resetButton.pressed) reset();
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
  spawn(TYR, hand.slots[2]);
  spawn(FRIGG, hand.slots[3], 2);
  spawn(LOKI, hand.slots[4]);
  spawn(HEL, hand.slots[5]);
  spawn(ODIN, hand.slots[6]);

  spawn(FROST_GIANT, board.slots[4], 3);
  spawn(FROST_GIANT, board.slots[6], 3);
  spawn(FROST_CRYSTAL, board.slots[5]);
  spawn(FROST_CRYSTAL, board.slots[0]);
  spawn(FROST_CRYSTAL, board.slots[1]);
  spawn(FROST_CRYSTAL, board.slots[2]);
  spawn(FROST_CRYSTAL, board.slots[3]);
  //spawn(FROST_CRYSTAL, board.slots[7]);
  spawn(FROST_CRYSTAL, board.slots[9]);

  canvas.width = UI_W;
  canvas.height = UI_H;
  ctx.imageSmoothingEnabled = false;

  onpointerdown = onpointermove = onpointerup = onPointerEvent;
  onresize = resize;

  document.title = "Gjallarhorn";
  document.body.style.cssText = `background:${UI_BG};cursor:none`;
  document.body.append(canvas);

  resize();
  loop();
}

init();
