/// <reference path="node_modules/vite/client.d.ts" />
// @ts-check

import {
  pointer,
  randf,
  randi,
  start,
  sub,
  dt,
  canvas,
  ctx,
  refresh,
  lerp,
  write,
  draw,
  load as img,
  strip,
  createFont,
  inside,
  exists,
  range,
  assert,
  clamp,
  easing,
  remove,
  npatch,
  wrap,
  measure,
  dirs,
  dirs4,
  add,
  random,
  scale,
  towards,
  keyboard,
  smallest,
  chebyshev,
} from "./engine.js";
import { spritesheet } from "./sprites.js";

/**
 * @import { Point, Vector, Rectangle } from "./engine.js";
 * @import { Sprite } from "./sprites.js";
 */

/**
 * @typedef {object} CardType
 * @prop {number} id
 * @prop {number} hp
 * @prop {number} tags
 * @prop {string} name
 * @prop {string} description
 * @prop {Sprite} sprite
 * @prop {(card: Card) => void | Action} play
 * @prop {(card: Card) => void | Action} turn
 * @prop {(card: Card, target: Card) => void | Action} touch
 */

/**
 * @typedef {object} CardState
 * @prop {Rectangle} bounds
 * @prop {Slot} slot
 * @prop {Vector} offset
 * @prop {Point} tweenStart
 * @prop {Point} tweenEnd
 * @prop {number} tweenElapsed
 * @prop {number} tweenDuration
 * @prop {Point} bumpOffset
 * @prop {number} bumpElapsed
 * @prop {number} bumpDuration
 */

/**
 * @typedef {CardType & CardState} Card
 */

/**
 * @typedef {object} Slot
 * @prop {number} x
 * @prop {number} y
 * @prop {Card} [card]
 * @prop {Rectangle} bounds
 * @prop {Sprite} sprite
 */

/**
 * @typedef {object} Level
 * @prop {number} area
 * @prop {(number | string)[]} story
 * @prop {number[]} board
 */

/**
 * @typedef {Slot & { card: Card }} SlotWithCard
 */

/**
 * @typedef {object} Drag
 * @prop {Card} card
 * @prop {Vector} offset
 */

/**
 * @callback Action
 * @returns {void | Promise<void>}
 */

/**
 * @typedef {object} Particle
 * @prop {number} x
 * @prop {number} y
 * @prop {number} vx
 * @prop {number} vy
 * @prop {number} age
 * @prop {number} ttl
 * @prop {number} delay
 * @prop {number} frame
 * @prop {number} layer
 * @prop {Sprite[]} sprites
 */

/**
 * @typedef {object} Wait
 * @prop {() => boolean} until
 * @prop {() => void} resolve
 */

/**
 * @typedef {object} Button
 * @prop {Rectangle} bounds
 * @prop {string} label
 * @prop {boolean} pressed
 * @prop {boolean} hovered
 * @prop {boolean} visible
 */

const DEV = import.meta.env?.DEV ?? true;
const UI_CELL_SIZE = 20;
const CARD_SIZE = 18;
const BOARD_WIDTH = 4;
const BOARD_HEIGHT = 4;
const HAND_WIDTH = 4;
const HAND_HEIGHT = 1;
const DIAGONALS = [dirs.NE, dirs.SE, dirs.SW, dirs.NW];
const BACKGROUND = 0;
const FOREGROUND = 1;

const PLACE_ASGARD = 0;
const PLACE_NIFLHEIM = 1;
const PLACE_MUSPELHEIM = 2;
const PLACE_JOTUNHEIM = 3;

const MODE_STORY = 0;
const MODE_DRAFT = 1;
const MODE_PLAY = 2;

let sprites = img("sprites.png");
let cardSprites = strip(spritesheet.cards, CARD_SIZE, CARD_SIZE);

let font = createFont({
  image: sprites,
  bounds: spritesheet.font,
});

/**
 * @type {Button[]}
 */
let buttons = [];

/**
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @returns {Button}
 */
function btn(x, y, label) {
  let pos = UI_GRID(x, y);

  /**
   * @type {Button}
   */
  let button = {
    label,
    bounds: { x: pos.x, y: pos.y, w: 0, h: 12 },
    pressed: false,
    hovered: false,
    visible: false,
  };

  buttons.push(button);

  return button;
}

let nextButton = btn(7, 9, "Next");
let resetButton = btn(7, 9, "Reset");
nextButton.visible = true;

/**
 * @param {number} x
 * @param {number} y
 * @returns {Point}
 */
function UI_GRID(x, y) {
  return { x: x * UI_CELL_SIZE, y: y * UI_CELL_SIZE };
}

/**
 * @param {Card} card
 * @param {Point} to
 * @param {number} duration
 */
function tween(card, to, duration) {
  card.tweenStart = { ...card.bounds };
  card.tweenEnd = { ...to };
  card.tweenDuration = duration;
  card.tweenElapsed = 0;
  return wait(() => card.tweenElapsed >= card.tweenDuration);
}

/**
 * @returns {Particle}
 */
function emit() {
  let p = pool.pop() ?? {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    age: 0,
    ttl: 0,
    delay: 0,
    frame: 0,
    layer: BACKGROUND,
    sprites: [],
  };
  particles.add(p);
  return p;
}

let mode = MODE_PLAY;
let level = 0;
let step = 0;

/**
 * @type {CardType[]}
 */
let types = [];

/**
 * @type {Card[]}
 */
let cards = [];

/**
 * @type {Slot[]}
 */
let hand = [];

/**
 * @type {Slot[]}
 */
let valhalla = [];

/**
 * @type {Slot[]}
 */
let board = [];

/**
 * @type {Action[]}
 */
let actions = [];

/**
 * @type {Drag | undefined}
 */
let drag;

/**
 * @type {Card | undefined}
 */
let preview;

/**
 * @type {Set<Particle>}
 */
let particles = new Set();

/**
 * @type {Particle[]}
 */
let pool = [];

/**
 * @type {Wait[]}
 */
let waits = [];

/**
 * @param {() => boolean} until
 * @returns {Promise<void>}
 */
function wait(until) {
  return new Promise((resolve) => {
    waits.push({ until, resolve });
  });
}

/**
 * @param {...Action} items
 */
function act(...items) {
  actions.push(...items);
}

/**
 * @param {...Action} items
 */
function react(...items) {
  actions.unshift(...items);
}

/**
 * @param {Card} card
 * @param {number} tags
 * @param {Vector[]} dirs
 * @returns {Card[]}
 */
function find(card, tags = ANY, dirs = dirs4) {
  return dirs
    .map((dir) => add(card.slot, dir))
    .map(getCard)
    .filter(exists)
    .filter((c) => is(c, tags));
}

/**
 * @param {Card} card
 * @param {Card} target
 * @param {number} tags
 * @returns {Card[]}
 */
function pierce(card, target, tags) {
  let step = towards(card.slot, target.slot);
  let targets = [target];

  while (true) {
    let next = getCard(add(target.slot, step));
    if (next && is(next, tags)) {
      target = next;
      targets.push(next);
    } else {
      break;
    }
  }

  return targets;
}

/**
 * @param {Slot} slot
 * @returns {slot is SlotWithCard}}
 */
function hasCard(slot) {
  return slot.card !== undefined;
}

/**
 * @param {Slot} slot
 * @returns {boolean}
 */
function isEmpty(slot) {
  return slot.card === undefined;
}

/**
 * @param {Card} card
 * @returns {boolean}
 */
function isHovered(card) {
  // Cards that are animating are not interactive.
  return !isAnimating(card) && inside(card.bounds, pointer);
}

/**
 * @param {Card} card
 * @returns {boolean}
 */
function isAnimating(card) {
  return card.tweenElapsed < card.tweenDuration;
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
 * @param {Point} p
 * @returns {Slot | undefined}
 */
function getSlot(p) {
  return isInBounds(p) ? board[p.x + p.y * BOARD_WIDTH] : undefined;
}

/**
 * @param {Point} p
 * @returns {Card | undefined}
 */
function getCard(p) {
  return getSlot(p)?.card;
}

/**
 * @param {Point} p
 * @returns {boolean}
 */
function isInBounds({ x, y }) {
  return x >= 0 && y >= 0 && x < BOARD_WIDTH && y < BOARD_HEIGHT;
}

/**
 * @param {Slot} slot
 */
function renderSlot(slot) {
  draw(sprites, slot.sprite, slot.bounds.x, slot.bounds.y);

  if (slot.card && drag?.card !== slot.card) {
    renderCard(slot.card);
  }
}

/**
 * @param {Button} button
 */
function renderButton(button) {
  let sprite = button.hovered ? spritesheet.btn_active : spritesheet.btn;
  let { x, y, w, h } = button.bounds;
  npatch(sprites, sprite, x, y, w, h);
  write(font, button.label, x + 6, y + 3);
}

/**
 * @param {Card} card
 */
function renderCard(
  card,
  x = card.bounds.x + card.offset.x,
  y = card.bounds.y + card.offset.y,
) {
  let { w, h } = card.bounds;
  draw(sprites, card.sprite, x, y);

  if (card.hp > 0) {
    npatch(sprites, spritesheet.tooltip, x + 3, y + h - 6, 11, 7);
    draw(sprites, spritesheet.icon_heart, x + 3, y + h - 6);
    write(font, "" + card.hp, x + 10, y + h - 5, "white");
  }
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} cols
 * @param {number} rows
 * @returns {Slot[]}
 */
function createSlotGrid(x, y, cols, rows) {
  let origin = UI_GRID(x, y);
  return range(0, rows).flatMap((y) =>
    range(0, cols).map((x) => ({
      x,
      y,
      sprite: spritesheet.card_slot,
      bounds: {
        x: origin.x + x * UI_CELL_SIZE,
        y: origin.y + y * UI_CELL_SIZE,
        w: CARD_SIZE,
        h: CARD_SIZE,
      },
    })),
  );
}

/**
 * @param {number} id
 * @param {number} [hp]
 * @param {Slot} slot
 * @returns {Card}
 */
function place(id, slot, hp) {
  let type = types[id];

  /**
   * @type {Card}
   */
  let card = {
    ...type,
    bounds: {
      x: slot.bounds.x,
      y: slot.bounds.y,
      w: type.sprite.w,
      h: type.sprite.h,
    },
    slot,
    hp: hp ?? type.hp,
    offset: { x: 0, y: 0 },
    tweenElapsed: 0,
    tweenDuration: 0,
    tweenStart: { x: 0, y: 0 },
    tweenEnd: { x: 0, y: 0 },
    bumpElapsed: 0,
    bumpDuration: 0,
    bumpOffset: { x: 0, y: 0 },
  };

  cards.push(card);
  slot.card = card;

  return card;
}

/**
 * @param {Card} card
 * @param {Slot} slot
 * @returns {Promise<void>}
 */
function move(card, slot) {
  // Check target slot is empty.
  assert(slot.card === undefined);

  // Remove from previous slot
  card.slot.card = undefined;

  slot.card = card;
  card.slot = slot;

  // Animate card to new slot
  return tween(card, slot.bounds, 200);
}

/**
 * @param {Card} card
 * @param {Slot} slot
 */
function play(card, slot) {
  move(card, slot);

  let action = card.play?.(card);
  if (action) act(action);

  for (let neighbour of find(card)) {
    let action = neighbour.touch(neighbour, card);
    if (action) act(action);
  }

  for (let slot of board) {
    let action = slot.card?.turn(slot.card);
    if (action) act(action);
  }
}

function renderStory() {
  renderParticles(BACKGROUND);

  let dialogue = LEVELS[level].story;
  let x = 1;
  let y = 1;

  for (let i = 0; i <= step; i++) {
    let id = /** @type {number} */ (dialogue[i * 2]);
    let text = /** @type {string} */ (dialogue[i * 2 + 1]);
    let character = types[id];
    let pos = UI_GRID(x, y);
    let color = `hsl(${id / 16}turn, 50%, 30%)`;
    draw(sprites, character.sprite, pos.x, pos.y);
    write(font, character.name, pos.x + UI_CELL_SIZE + 2, pos.y + 1, color);
    write(font, text, pos.x + UI_CELL_SIZE + 3, pos.y + 9, "black");
    write(font, text, pos.x + UI_CELL_SIZE + 2, pos.y + 8);
    y += 1;
  }

  renderButton(nextButton);
  renderParticles(FOREGROUND);
}

function renderPlay() {
  renderParticles(BACKGROUND);

  for (let slot of board) {
    renderSlot(slot);
  }

  for (let slot of valhalla) {
    renderSlot(slot);
  }

  for (let slot of hand) {
    renderSlot(slot);
  }

  if (drag) {
    renderCard(drag.card);
  }

  if (preview) {
    let card = preview;
    let lines = wrap(font, card.description, 90);
    let width = Math.max(...lines.map((s) => measure(font, s)));
    let height = lines.length * font.lineHeight;

    let x = card.bounds.x + card.bounds.w / 2 - width / 2;
    let y = card.bounds.y - height - 4;
    npatch(sprites, spritesheet.tooltip, x - 3, y - 2, width + 6, height + 2);

    for (let line of lines) {
      write(font, line, x, y);
      y += font.lineHeight;
    }
  }

  renderParticles(FOREGROUND);

  renderButton(resetButton);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (mode === MODE_STORY) {
    renderStory();
  } else if (mode === MODE_PLAY) {
    renderPlay();
  }
}

/**
 * @param {number} layer
 */
function renderParticles(layer) {
  for (let p of particles) {
    if (p.layer === layer) {
      let spr = p.sprites[p.frame];
      if (spr) draw(sprites, spr, p.x, p.y);
    }
  }
}

function updateWaits() {
  waits = waits.filter((w) => {
    if (w.until()) {
      w.resolve();
      return false;
    }
    return true;
  });
}

function updateButtons() {
  for (let button of buttons) {
    button.bounds.w = measure(font, button.label) + 12;
    button.hovered = inside(button.bounds, pointer);
    button.pressed = button.hovered && pointer.pressed > 0;
  }
}

function updateParticles() {
  if (particles.size > 0) {
    refresh();
  }

  for (let p of particles) {
    p.delay -= dt;

    if (p.delay <= 0) {
      p.age += dt;
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      let k = p.age / p.ttl;
      p.frame = Math.floor(clamp(0, 1, k) * p.sprites.length);
    }

    if (p.age > p.ttl) {
      particles.delete(p);
      pool.push(p);
    }
  }
}

function updateAnimations() {
  for (let card of cards) {
    if (card.tweenElapsed < card.tweenDuration) {
      card.tweenElapsed += dt;
      let k = clamp(0, 1, card.tweenElapsed / card.tweenDuration);
      let t = easing.smooth(k);
      card.bounds.x = lerp(card.tweenStart.x, card.tweenEnd.x, t);
      card.bounds.y = lerp(card.tweenStart.y, card.tweenEnd.y, t);
      refresh();
    }

    if (card.bumpElapsed < card.bumpDuration) {
      card.bumpElapsed += dt;
      let k = clamp(0, 1, card.bumpElapsed / card.bumpDuration);
      let t = Math.sin(k * Math.PI);
      card.offset.x = lerp(0, card.bumpOffset.x, t);
      card.offset.y = lerp(0, card.bumpOffset.y, t);
      refresh();
    }
  }
}

let running = false;

async function updateActions() {
  if (running) return;

  let next = actions.shift();

  if (next) {
    running = true;
    await next();
    running = false;
  }
}

function updateEditor() {
  /** @type {Record<string, number>} */
  let map = {
    1: FROST_GIANT,
    2: FROST_CRYSTAL,
  };

  let slot = board.find((slot) => inside(slot.bounds, pointer));

  for (let key in map) {
    if (slot && keyboard.down.has(key)) {
      let id = map[key];
      if (slot.card?.id !== id) {
        place(id, slot);
      }
    }
  }

  if (keyboard.pressed.has("X")) {
    for (let slot of board) {
      slot.card = undefined;
    }
  }

  if (keyboard.down.has("x") && slot?.card) {
    slot.card = undefined;
  }

  if (keyboard.pressed.has("-") && slot?.card) {
    slot.card.hp = clamp(1, 9, slot.card.hp - 1);
  }

  if (keyboard.pressed.has("=") && slot?.card) {
    slot.card.hp = clamp(1, 9, slot.card.hp + 1);
  }

  if (keyboard.pressed.has("s")) {
    console.log(save());
  }
}

/**
 * @param {number[]} state
 */
function load(state) {
  let slots = [...board];

  for (let i = 0; i < state.length; i += 2) {
    let id = state[i];
    let hp = state[i + 1];
    let slot = slots.shift();
    if (slot && id >= 1) {
      place(id, slot, hp);
    }
  }
}

function save() {
  return board.flatMap((slot) => {
    return slot.card ? [slot.card.id, slot.card.hp] : [0, 0];
  });
}

function update() {
  updateWaits();
  updateButtons();
  updateParticles();
  updateAnimations();
  updateActions();
  if (DEV) updateEditor();

  if (pointer.dx || pointer.dy) {
    preview = undefined;
  }

  // If there is an action running, we don't update any other state.
  if (running) return;

  if (nextButton.pressed && mode === MODE_STORY) {
    step += 1;
    let story = LEVELS[level].story;
    if (step * 2 >= story.length) {
      mode = MODE_PLAY;
    }
  }

  if (resetButton.pressed && mode === MODE_PLAY) {
    // Move all the gods back to the hand
    for (let card of cards) {
      if (is(card, GOD)) {
        let slot = hand.find(isEmpty);
        if (slot) move(card, slot);
      }
    }

    for (let slot of valhalla) {
      slot.card = undefined;
    }

    load(LEVELS[level].board);
  }

  if (random() < 0.3) {
    let p = emit();
    p.x = randi(0, canvas.width);
    p.y = randi(0, canvas.height);
    p.vx = randf(-5, 5);
    p.vy = randf(-5, -1);
    p.frame = 0;
    p.age = 0;
    p.ttl = randi(300, 1000);
    p.sprites = strip(spritesheet.particles);
  }

  if (drag) {
    let { card, offset } = drag;

    let slot = board.concat(hand).find((slot) => {
      return inside(slot.bounds, pointer) && isEmpty(slot);
    });

    if (pointer.buttons === 1) {
      if (slot) {
        // Snap to slot
        card.bounds.x = slot.bounds.x;
        card.bounds.y = slot.bounds.y;
      } else {
        card.bounds.x = pointer.x - offset.x;
        card.bounds.y = pointer.y - offset.y;
      }
    } else if (slot && board.includes(slot)) {
      play(card, slot);
      drag = undefined;
    } else if (slot && hand.includes(slot)) {
      move(card, slot);
    } else {
      tween(card, card.slot.bounds, 200);
      drag = undefined;
    }
  } else {
    for (let slot of hand) {
      let card = slot.card;
      if (!card) continue;
      let hover = inside(card.bounds, pointer);

      if (hover && pointer.pressed) {
        let offset = sub(pointer, card.bounds);
        drag = { card, offset };
      }
    }

    for (let card of cards) {
      if (isHovered(card)) {
        preview = card;
      }
    }
  }
}

/**
 * @param {Card} card
 * @param {Card} target
 */
function bump(card, target) {
  card.bumpOffset = scale(sub(target.bounds, card.bounds), 0.25);
  card.bumpElapsed = 0;
  card.bumpDuration = 150;
}

/**
 * @param {Card} card
 * @param {Card} target
 * @returns {Action}
 */
function hit(card, target) {
  return async () => {
    if (!isAlive(card) || !isAlive(target)) return;

    bump(card, target);

    // Wait for the midpoint of the bump animation before dealing damage.
    await wait(() => card.bumpElapsed >= card.bumpDuration / 2);

    target.hp = Math.max(0, target.hp - 1);

    if (target.hp <= 0) {
      let slot = valhalla.find(isEmpty);
      if (slot && is(target, GOD | GIANT)) {
        move(target, slot);
      } else {
        target.slot.card = undefined;
        cards = remove(cards, target);
      }
    }

    // Finish the bump animation before ending this action.
    await wait(() => card.bumpElapsed >= card.bumpDuration);
  };
}

/**
 * @param {Card} card
 * @returns {boolean}
 */
function isAlive(card) {
  return board.includes(card.slot);
}

/**
 * @param {Card} card
 * @param {Card} target
 * @returns {Action}
 */
function push(card, target) {
  return () => {
    if (!isAlive(card) || !isAlive(target)) return;

    let step = towards(card.slot, target.slot);
    let slot = getSlot(add(target.slot, step));

    if (slot && isEmpty(slot)) {
      move(target, slot);
    }
  };
}

/**
 * @param {Card} card
 * @returns {Action}
 */
function returnToHand(card) {
  return () => {
    let slot = hand.find(isEmpty);

    if (slot) {
      return move(card, slot);
    }
  };
}

/**
 * @param {Card} card
 * @param {Card} target
 * @returns {Action}
 */
function returnToHandIfTargetIsDead(card, target) {
  return () => {
    if (card.hp >= 0 && target.hp <= 0) {
      react(returnToHand(card));
    }
  };
}

/**
 * @param {number} id
 * @param {Partial<CardType>} params
 */
function define(id, params) {
  let sprite = cardSprites[id];

  types[id] = {
    id,
    tags: NONE,
    hp: 1,
    name: "",
    description: "",
    sprite,
    play: () => {},
    turn: () => {},
    touch: () => {},
    ...params,
  };
}

const NONE = 0;
const ANY = ~0;
const GOD = 1;
const GIANT = 2;
const CRYSTAL = 4;

const HEIMDALL = 1;
const ODIN = 2;
const THOR = 3;
const HEL = 4;
const TYR = 5;
const FRIGG = 6;
const LOKI = 7;
const FROST_GIANT = 8;
const FROST_CRYSTAL = 9;

define(HEIMDALL, {
  tags: GOD,
  name: "Heimdall",
  description: "Heimdall returns adjacent allies to the Bifrost",
  play(card) {
    for (let target of find(card, GIANT)) {
      act(hit(card, target));
    }
    for (let target of find(card, GOD)) {
      act(returnToHand(target));
    }
  },
});

define(FRIGG, {
  tags: GOD,
  name: "Skadi",
  description: "Skadi attacks diagonally",
  play(card) {
    for (let target of find(card, GIANT, DIAGONALS)) {
      act(hit(card, target));
    }
  },
});

define(ODIN, {
  tags: GOD,
  name: "Odin",
  description: "Odin's spear pierces through enemies",
  play(card) {
    for (let target of find(card, GIANT)) {
      for (let next of pierce(card, target, GIANT)) {
        act(hit(card, next));
      }
    }
  },
});

define(THOR, {
  tags: GOD,
  name: "Thor",
  description: "Thor smashes crystals",
  play(card) {
    for (let target of find(card, GIANT | CRYSTAL)) {
      act(hit(card, target));
    }
  },
});

define(HEL, {
  tags: GOD,
  name: "Hel",
  description: "Hel hits for each soul in Valhalla",
  play(card) {
    let times = valhalla.filter(hasCard).length;

    for (let target of find(card, GIANT)) {
      for (let i = 0; i < times; i++) {
        act(hit(card, target));
      }
    }
  },
});

define(LOKI, {
  tags: GOD,
  name: "Loki",
  description: "Loki returns to the Bifrost after slaying a giant",
  play(card) {
    for (let target of find(card, GIANT)) {
      act(hit(card, target), returnToHandIfTargetIsDead(card, target));
    }
  },
});

define(TYR, {
  tags: GOD,
  name: "Tyr",
  description: "Tyr's attacks push giants",
  play(card) {
    for (let target of find(card, GIANT)) {
      act(hit(card, target), push(card, target));
    }
  },
});

define(FROST_GIANT, {
  tags: GIANT,
  name: "Giant",
  hp: 1,
  description: "Frost giants attack if gods are played next to them",
  touch: (card, target) => hit(card, target),
});

define(FROST_CRYSTAL, {
  tags: CRYSTAL,
  name: "Crystal",
  hp: 0,
});

/**
 * @type {Level[]}
 */
const LEVELS = [
  {
    story: [
      HEIMDALL,
      "Terrible news father, giants took the Gjallarhorn!",
      ODIN,
      "Forgive me, Heimdall. What is the Gjallarhorn?",
      HEIMDALL,
      "It's the UNIQUE HORN that I use to guard the Bifrost!",
      ODIN,
      "Alas... My memory fails me. What is the Bifrost?",
      HEIMDALL,
      "It's the RAINBOW BRIDGE that links Asgard to the other worlds!",
      ODIN,
      "Of course. Then you must cross the Bifrost to retrieve it.",
    ],
    area: PLACE_NIFLHEIM,
    board: [
      0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 8, 1, 9, 0, 8, 1,
    ],
  },
  {
    story: [
      HEIMDALL,
      "There are simply too many giants!",
      FRIGG,
      "Then I shall join you!",
    ],
    area: PLACE_NIFLHEIM,
    board: [],
  },
];

function init() {
  document.head.innerHTML += `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`;
  document.title = "Gjallarhorn";

  let s = document.body.style;
  s.position = "fixed";
  s.background = "#11151c";
  s.display = "flex";
  s.justifyContent = "center";

  valhalla = createSlotGrid(6, 1, HAND_WIDTH, HAND_HEIGHT);
  board = createSlotGrid(6, 3, BOARD_WIDTH, BOARD_HEIGHT);
  hand = createSlotGrid(6, 8, HAND_WIDTH, HAND_HEIGHT);

  place(HEIMDALL, hand[0]);
  place(ODIN, hand[1]);
  place(TYR, hand[2]);
  place(HEL, hand[3]);
  place(LOKI, hand[3]);
  place(THOR, hand[2]);

  load(LEVELS[level].board);

  start({ width: 320, height: 200, update, render });
}

init();
