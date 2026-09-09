import {
  canvas,
  ctx,
  draw,
  drawNinePatch,
  spriteToDataUrl,
  write,
} from "./graphics.js";
import { sfx, SFX_CLICK, SFX_SLASH, SFX_TAP } from "./audio.js";
import { spritesheet } from "./sprites.js";
import {
  add,
  anchor,
  cardinals,
  diagonals,
  exists,
  inside,
  lerp,
  pick,
  prng,
  random,
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
 * @prop {Rectangle} bounds
 * @prop {number} cols
 * @prop {number} rows
 *
 * @typedef {object} Slot
 * @prop {Zone} zone
 * @prop {number} x
 * @prop {number} y
 * @prop {number} palette
 * @prop {Rectangle} bounds
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
 * @prop {number} paletteDamage
 * @prop {Rectangle} bounds
 * @prop {Slot} slot
 * @prop {number} targets
 * @prop {Vector[]} adjacency
 * @prop {number} flashTimer
 * @prop {Slot} [startingSlot]
 * @prop {number} startingHp
 * @prop {(card: Card, targets: Card[]) => void | Promise<void>} effect
 *
 * @typedef {object} CardDefinition
 * @prop {number} [hp]
 * @prop {number} [tags]
 * @prop {string} name
 * @prop {string} [description]
 * @prop {number} [sprite]
 * @prop {number} [palette]
 * @prop {number} [paletteDamage]
 * @prop {number} [targets]
 * @prop {Vector[]} [adjacency]
 * @prop {(card: Card, targets: Card[]) => void | Promise<void>} [effect]
 *
 * @typedef {[character: CardType, text: string]} Dialogue
 * @typedef {[puzzle: string, characters: CardType[], ...dialogue: Dialogue[]]} Level
 *
 * @typedef {object} Timer
 * @prop {number} duration
 * @prop {number} elapsed
 * @prop {(t: number) => void} callback
 * @prop {() => void} done
 *
 * @typedef {object} Particle
 * @prop {number} duration
 * @prop {number} elapsed
 * @prop {number} x
 * @prop {number} y
 * @prop {number} vx
 * @prop {number} vy
 * @prop {number} mass
 * @prop {number} floor
 * @prop {Sprite} sprite
 * @prop {number} palette
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
 * @prop {number} palette
 * @prop {number} paletteActive
 *
 * @typedef {() => void | Promise<void>} Action
 */

const IS_MOBILE = innerWidth < innerHeight;
const IS_EDITOR = location.search === "?edit";

const UI_W = IS_MOBILE ? 160 : 420;
const UI_H = 242;
const UI_CENTER_X = UI_W / 2;
const UI_CENTER_Y = UI_H / 2;
const UI_CARD_SIZE = 18;
const UI_CELL_SIZE = 20;
const UI_GAP = 10;
const UI_CARD_ANIMATION_MS = 250;
const UI_ATTACK_MS = 150;
const UI_BG = "#071326";

const UI_BOARD_COLS = 5;
const UI_BOARD_ROWS = 5;
const UI_BOARD_W = UI_BOARD_COLS * UI_CELL_SIZE;
const UI_BOARD_H = UI_BOARD_ROWS * UI_CELL_SIZE;
const UI_BOARD_X = UI_CENTER_X - UI_BOARD_W / 2;
const UI_BOARD_Y = UI_CENTER_Y - UI_BOARD_H / 2;

const UI_GRAVE_COLS = 7;
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
const UI_BUTTON_ANCHOR_Y = UI_HAND_Y + UI_HAND_H + 4;
const UI_CARD_SPRITES = strip(spritesheet.cards, UI_CARD_SIZE, UI_CARD_SIZE);
const UI_CURSOR_SPRITES = strip(spritesheet.cursors, 9);
const UI_CURSOR_PIVOT_X = spritesheet.cursors.pivot.x;
const UI_CURSOR_PIVOT_Y = spritesheet.cursors.pivot.y;

const UI_DIALOGUE_WIDTH = UI_HAND_W;
const UI_DIALOGUE_HEIGHT = 25;
const UI_DIALOGUE_X = UI_CENTER_X - UI_DIALOGUE_WIDTH / 2;
const UI_DIALOGUE_Y = UI_HAND_Y - 3;

const UI_TIP_H = 24;
const UI_TIP_W = UI_HAND_W;
const UI_TIP_X = UI_HAND_X;
const UI_TIP_Y = UI_HAND_Y + UI_HAND_H + 2;

const UI_PROGRESS_H = 13;
const UI_PROGRESS_W = 8;
const UI_PROGRESS_X = UI_CENTER_X - UI_PROGRESS_W / 2;
const UI_PROGRESS_Y = UI_GRAVE_Y - UI_PROGRESS_H - 5;

const DEG_90 = Math.PI / 2;
const DEG_180 = DEG_90 * 2;
const DEG_270 = DEG_90 * 3;
const DEG_360 = DEG_90 * 4;

const CURSOR_DEFAULT = 0;
const CURSOR_POINTER = 1;
const CURSOR_GRAB = 2;
const CURSOR_GRABBING = 3;

// Each palette index here refers to one row within the "swaps" section of
// the sprite atlas.
const PALETTE_GREYSCALE = 0;
const PALETTE_HEIMDALL = 1;
const PALETTE_ODIN = 2;
const PALETTE_THOR = 3;
const PALETTE_HEL = 4;
const PALETTE_TYR = 5;
const PALETTE_FRIGG = 6;
const PALETTE_LOKI = 7;
const PALETTE_FROST_CRYSTAL = 8;
const PALETTE_FROST_GIANT = 9;
const PALETTE_FIRE_GIANT = 10;
const PALETTE_11 = 11;
const PALETTE_12 = 12;
const PALETTE_RUNESTONE = 13;
const PALETTE_DAMAGE = 14;
const PALETTE_WHITE = 15;
const PALETTE_BLACK = 16;
const PALETTE_BTN_PRIMARY = 17;
const PALETTE_BTN_PRIMARY_ACTIVE = 18;
const PALETTE_BTN_SECONDARY = 19;
const PALETTE_BTN_SECONDARY_ACTIVE = 20;

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
const STONE = 16;
const TRANSIENT = 32;

// [Cards]
const TUTORIAL = 0;
const HEIMDALL = 1;
const ODIN = 2;
const THOR = 3;
const HEL = 4;
const TYR = 5;
const FRIGG = 6;
const LOKI = 7;
const FROST_CRYSTAL = 8;
const FROST_GIANT = 9;
const FIRE_GIANT = 10;
const CHAOS_GIANT = 11;
const GJALLARHORN = 12;
const YMIR = 13;
const BLAST_CRYSTAL = 14;

/**
 * @typedef {(
 *   | typeof TUTORIAL
 *   | typeof HEIMDALL
 *   | typeof ODIN
 *   | typeof THOR
 *   | typeof HEL
 *   | typeof TYR
 *   | typeof FRIGG
 *   | typeof LOKI
 *   | typeof FROST_CRYSTAL
 *   | typeof FROST_GIANT
 *   | typeof FIRE_GIANT
 *   | typeof CHAOS_GIANT
 *   | typeof GJALLARHORN
 *   | typeof YMIR
 *   | typeof BLAST_CRYSTAL
 * )} CardType
 */

/**
 * @type {Record<CardType, CardDefinition>}
 */
const CARDS = {
  [TUTORIAL]: {
    name: "TUTORIAL",
  },
  [HEIMDALL]: {
    name: "HEIMDALL",
    description: "RECALLS ADJACENT GODS",
    targets: GOD | GIANT,
    async effect(card, targets) {
      for (let target of targets) {
        if (is(target, GOD)) await summon(target);
        if (is(target, GIANT)) await attack(card, target);
      }
    },
  },
  [ODIN]: {
    name: "ODIN",
    hp: 2,
    description: "ADDS A GJALLARHORN TO HAND",
    async effect(card, targets) {
      await defaultAttackEffect(card, targets);
      let slot = hand.slots.find(isEmpty);
      if (slot) spawn(GJALLARHORN, slot);
    },
  },
  [THOR]: {
    name: "THOR",
    targets: GIANT | CRYSTAL | STONE,
    description: "DESTROYS CRYSTALS & STONES",
  },
  [HEL]: {
    name: "HEL",
    description: "ATTACKS FOR EACH CARD IN THE GRAVE",
    async effect(card, targets) {
      let count = grave.slots.filter(isNotEmpty).length;
      for (let target of targets) {
        for (let i = 0; i < count; i++) {
          await attack(card, target);
        }
      }
    },
  },
  [TYR]: {
    name: "TYR",
    hp: 2,
    targets: GOD | GIANT,
    description: "PUSHES GODS AND GIANTS",
    async effect(card, targets) {
      for (let target of targets) {
        if (is(target, GIANT)) await attack(card, target);
        await push(card, target);
      }
    },
  },
  [FRIGG]: {
    name: "FRIGG",
    hp: 1,
    adjacency: diagonals,
    description: "ATTACKS ON DIAGONALS",
  },
  [LOKI]: {
    name: "LOKI",
    description: "SWAPS ADJACENT CARDS",
    targets: GOD,
    async effect(card, targets) {
      let slots = cardinals.map((dir) => at(board, add(card.slot, dir)));
      let [n, e, s, w] = slots;
      if (n && s) await swap(n, s);
      if (e && w) await swap(e, w);
    },
  },
  [FROST_CRYSTAL]: {
    hp: 0,
    name: "CRYSTAL",
    tags: CRYSTAL,
    targets: NONE,
    description: "BLOCKS YOUR WAY",
    paletteDamage: PALETTE_FROST_CRYSTAL,
  },
  [FROST_GIANT]: {
    hp: 1,
    tags: GIANT,
    name: "GIANT",
    targets: GOD,
    description: "ATTACKS ADJACENT GODS",
  },
  [FIRE_GIANT]: {
    sprite: FROST_GIANT,
    hp: 2,
    tags: GIANT,
    name: "FIRE GIANT",
    targets: GOD | GIANT,
    description: "ATTACKS GODS AND GIANTS",
  },
  [CHAOS_GIANT]: {
    sprite: FROST_GIANT,
    hp: 3,
    tags: GIANT,
    targets: GOD | GIANT,
    name: "CHAOS GIANT",
    description: "PUSHES GODS AND GIANTS AWAY",
    async effect(card, targets) {
      for (let target of targets) {
        await push(card, target);
      }
    },
  },
  [GJALLARHORN]: {
    name: "GJALLARHORN",
    description: "PLAY ADJACENT GODS AGAIN",
    tags: TRANSIENT,
    sprite: 10,
    palette: 2,
    hp: 0,
    targets: GOD,
    async effect(card, targets) {
      for (let target of targets) {
        if (target.type !== ODIN) {
          await trigger(target);
        }
      }
      despawn(card);
    },
  },
  [YMIR]: {
    hp: 9,
    tags: GIANT,
    name: "YMIR",
    targets: GOD,
    sprite: FROST_GIANT,
    palette: 12,
    description: "CREATES CRYSTALS IN EMPTY SLOTS",
    async effect(card, targets) {
      for (let step of cardinals) {
        let slot = at(board, add(card.slot, step));
        if (slot && isEmpty(slot)) {
          let crystal = spawn(FROST_CRYSTAL, slot);
          crystal.tags |= TRANSIENT;
        }
      }
      await defaultAttackEffect(card, targets);
    },
  },
  [BLAST_CRYSTAL]: {
    name: "BLAST CRYSTAL",
    description: "PUSHES ADJACENT CARDS IF DESTROYED",
    tags: CRYSTAL,
    sprite: 8,
    palette: 18,
    hp: 0,
  },
};

/**
 * @type {Record<number, Level>}
 */
const LEVELS = {
  // Tutorial 1
  // There are some diagonal gaps that they might try but the only solution
  // involves playing in the south slot.
  1: [
    "-------I0---I0J1I0--I0-I0------",
    [HEIMDALL],
    [HEIMDALL, "GIANTS TOOK THE GJALLARHORN!"],
    [ODIN, "OH NO... HEIMDALL?\nWHAT IS A GJALLARHORN?"],
    [HEIMDALL, "THE HORN THAT SUMMONS GODS\nBACK TO THE BIFROST!"],
    [ODIN, "A UNIQUE HORN?"],
    [HEIMDALL, "YES! A UNIQUE HORN!"],
    [ODIN, "AND YOU SAID SOMETHING ABOUT\nA BIFROST?"],
    [HEIMDALL, "THE RAINBOW BRIDGE THAT\nCONNECTS US TO OTHER WORLDS!"],
    [ODIN, "RIGHT... SOUNDS LIKE YOU\nSHOULD GET IT BACK!"],
    [TUTORIAL, "CLEAR EVERY GIANT FROM THE\nBOARD TO ADVANCE"],
  ],

  // Tutorial 2
  // Teach the player that they need to hit twice when giants have more health.
  2: [
    "------------J2",
    [HEIMDALL, THOR],
    [THOR, "BIT OF A SLOW DAY IN ASGARD,\nI'LL HELP YOU!"],
    [TUTORIAL, "GIANTS RETALIATE WHEN THEY\nARE ATTACKED."],
  ],

  // Prisoner
  // Teach the player to use Thor to smash crystals and Heimdall to return him
  // to the hand.
  3: [
    "------I0I0I0--I0J2I0--I0I0I0------",
    [HEIMDALL, THOR],
    [TUTORIAL, "EACH GOD HAS A POWER THEY\nUSE AFTER ATTACKING."],
    [TUTORIAL, "CHOOSE THE ORDER YOU PLAY\nTHE GODS IN WISELY."],
  ],

  // Prison Break
  // Teach the player to neutralize a larger pattern of giants.
  4: ["------J1I0J1-J1I0-I0J1-J1I0J1------", [HEIMDALL, THOR]],

  // Push
  // Teach the player to push with Tyr, pushing a giant into a spot where
  // Thor can hit two.
  5: [
    "-------I0J1I0-I0-----J2-------",
    [THOR, TYR],
    [TYR, "LOOKS LIKE YOU MIGHT NEED\nSOME HELP!"],
  ],

  // Pushing Thor
  // Teach the player to push Thor instead of a giant to repeat his effect.
  6: [
    "-I0J1I0--J1I0J1--J1-J1--------J1--",
    [THOR, TYR],
    [TUTORIAL, "PUSHING A GOD PLAYS THEM\nAGAIN."],
  ],

  // Push & Reset
  // Teach the player to use all three character effects together in a chain.
  7: ["--J1---I0I0I0-J1I0-I0J1-I0I0I0---J1--", [HEIMDALL, THOR, TYR]],

  // Fortress
  // Use Thor to break into a fortress with pushes from Tyr.
  8: ["I0I0J2I0I0-J2I0J2-I0I0I0I0I0I0---I0-----", [HEIMDALL, THOR, TYR]],

  // Pushing Trap
  // Teach the player that pushing is sometimes worse than summoning.
  9: ["----------------J2I0J2--I0J3I0", [HEIMDALL, THOR, TYR]],

  // Thortex
  // Use Tyr to turn the spiral into a cross.
  10: ["--I0-----J2-I0J2-J1I0-J3-----I0--", [HEIMDALL, THOR, TYR]],

  // Lazarus
  // Vertical puzzle that requires retriggering Heimdall with a push.
  11: ["-J1I0----I0J2----J1--------J1--", [HEIMDALL, THOR, TYR]],

  // Frigg Tutorial
  12: ["--------J1-------J1", [FRIGG]],

  // Thin Line
  // Use Frigg and Heimdall to defeat giants in a diagonal line.
  13: ["------J1-----J1-----J3", [HEIMDALL, FRIGG]],

  // Frigger
  // Use Tyr to arrange a triple shot before recalling carefully so that
  // Heimdall doesn't block the finale.
  14: ["-----J1J2---I0--J3J1J1J2", [HEIMDALL, TYR, FRIGG]],

  // Fortress II
  // Heimdall helps Thor burrow in, then Frigg finishes the job.
  15: ["-I0-I0-I0J3I0J1I0-I0I0I0-I0J3I0J1I0-I0-I0", [HEIMDALL, THOR, FRIGG]],

  // Blast Crystal
  16: ["------J1J1J1--J1O0---J1J1J1", [HEIMDALL, THOR, FRIGG]],

  // T-pain
  // Clear out a T shaped level of giants using a triple push from Tyr.
  17: ["J1J1J1J1J1-----J1J1-J1J1-J1-J1--J1-J1", [HEIMDALL, THOR, FRIGG, TYR]],

  // Overwhelming Odds
  // This one is hard. Frigg hits the southern diagonal, Thor hits 3 crystals
  // to the north, Heimdall summons both, Thor hits 3 giants, Frigg finishes.
  // Might be the only solution.
  18: ["-I0J2I0I0--I0J1I0-I0J4I0I0--I0-I0J1----", [HEIMDALL, THOR, FRIGG]],

  // Fire Giant
  // Learn about using fire giants to hit their own neighbours.
  19: ["-------J1---J1K2J1", [THOR, FRIGG]],

  // Fire Giants
  // Learn about using fire giants offensively.
  20: ["I0J3I0-----J1-I0-K4---J1", [HEIMDALL, TYR, FRIGG]],

  // Tough Guy
  // Fire giants "defending" a big frost giant
  21: ["-------K2---K2J4K2---K2", [HEIMDALL, TYR, FRIGG]],

  // Welcome to Hel
  // Basic introduction to Hel's multihit mechanics.
  22: ["--J4---------J1---J1-J1---J1", [THOR, HEL]],

  // Hel 2
  24: ["I0J1-J1I0-J1I0J1-I0J2J2J2I0-I0-I0-I0J1-J1I0", [THOR, TYR, FRIGG, HEL]],

  // Helicate Balance
  // Use Hel's multihit before killing too many giants.
  23: ["-----J3----K4-J2-J1J3------J2-J1", [HEIMDALL, FRIGG, HEL]],

  // X Marks the Spot
  25: ["J1---J1-J1-J1---K5---J1-J1-J1---J1", [HEIMDALL, THOR, TYR, FRIGG, HEL]],

  // Boxing Match
  // The giants can destroy each other if Tyr forces them to meet face to face.
  26: ["----------I0K4-K5I0", [TYR, THOR, FRIGG]],

  // Chaos is a Ladda
  // Learning about Chaos Giants.
  27: ["-------J1----L2--------J1-J1", [THOR, HEIMDALL]],

  // Distributed Chaos
  // Use a Chaos Giant to get giants set up for Frigg.
  28: ["------------L2J1---J1", [THOR, FRIGG]],

  // Blocker
  // Be careful not to play Tyr first otherwise the board becomes unwinnable.
  29: ["------J1-J1--J1-J1--I0L2I0", [THOR, TYR]],

  // Throne Room
  // Long line of guards for a chaos giant.
  // Start with Frigg next to the chaos giant and use a combination of the giant
  // and Tyr to push her along the line of guards.
  30: ["-----J1J1J1J1J1----L2J1J1J1J1J1", [TYR, FRIGG, THOR]],

  // Chaos Sokoban
  // Super fun. Involves some careful deliberation about how to push the chaos
  // giants to open up enough space for Thor to clear the central crystal for
  // Frigg to take a shot.
  31: [
    "I0I0I0-I0--L2-I0I0L2I0L1I0I0L3I0-I0I0-I0I0I0",
    [HEIMDALL, TYR, FRIGG, THOR],
  ],

  // Loki Tutorial
  32: [
    "------J1---J1-I0-J1-J1",
    [LOKI, THOR],
    [THOR, "LOKI IS A TRICKSTER. HE\nWON'T ATTACK GIANTS."],
  ],

  // Loki Slingshot
  // Use Loki to move a crystal then swap Heimdall into hitting a giant.
  33: ["-I0J1I0--I0I0I0-------------J1", [LOKI, HEIMDALL]],

  // The Scorpion
  34: ["--J1---J1J1J1--K2-K2-K2---K2-K2-K2", [LOKI, TYR, HEIMDALL, THOR]],

  // Loki's Corridor
  // Use Loki to swap Tyr into pushing Thor to finish.
  35: ["-----J1I0J1I0J1--I0-I0J1I0J1I0J1", [LOKI, TYR, THOR]],

  // Blast Corridor
  // Use the blast crystal to retrigger Heimdall in order to play Frigg 3 times.
  36: ["-J1-J1--J1----J2-J2----J1--O0-J2", [HEIMDALL, THOR, FRIGG]],

  // Lines in the Ice
  // Use Loki to swap Heimdall and Thor into the action and Frigg + Hel to clean up.
  37: [
    "--I0---J1I0J1-I0I0K7I0I0-J1I0J1---I0",
    [HEIMDALL, THOR, FRIGG, HEL, LOKI],
  ],

  // The Wall
  // Sacrifice Thor on the chaos side of the wall for Hel.
  38: ["------J1I0K5---I0---J1I0", [THOR, FRIGG, HEL]],

  // Odin
  40: [
    "------------N9",
    [HEIMDALL, THOR, TYR, FRIGG, HEL, LOKI, ODIN],
    [HEIMDALL, "STILL NO SIGN OF THE\nGJALLARHORN!"],
    [ODIN, "WHAT'S IT LIKE?"],
    [HEIMDALL, "WELL IT'S GOLD AND IT MAKES\nA SOUND LIKE $$-$$$-$!"],
    [ODIN, "A BIT LIKE THIS?"],
    [GJALLARHORN, "$$-$$$-$"],
    [HEIMDALL, "YES ODIN... EXACTLY LIKE\nTHAT..."],
    // TODO: Why did Odin take/have the horn?
    [ODIN, "LET'S SEE IF WE CAN'T\nPUT IT TO GOOD USE!"],
  ],

  // [Unused puzzles]
  // Hel + Rune
  // "I0J1K9J1I0J1---J1J1-M0-J1"
  //
  // Chaos Crossbow
  // "---J2----J1-L3--L3----J1----J1I0"
  //
  // Frigg's Gambit
  // Many solutions
  // "----J1---J1--J1--I0---J1--J2I0J2"
};

/**
 * The sprite index of the active cursor.
 * @type {number}
 */
let cursor = CURSOR_DEFAULT;

/**
 * All active buttons in the scene.
 * @type {Button[]}
 */
let buttons = [];

/**
 * All active timers in the scene.
 * @type {Set<Timer>}
 */
let timers = new Set();

/**
 * All active particles in the scene.
 * @type {Set<Particle>}
 */
let particles = new Set();

/**
 * A master set of all cards from this level.
 * @type {Set<Card>}
 */
let cards = new Set();

/**
 * The cards that are currently being targeted.
 * @type {Set<Card>}
 */
let targets = new Set();

/**
 * The drag state for dragging cards.
 * @type {Drag | undefined}
 */
let drag;

/**
 * The card we're currently previewing.
 * @type {Card | undefined}
 */
let preview;

/**
 * Actions in the queue will be processed during the next available frame.
 * @type {Array<() => void | Promise<void>>}
 */
let actions = [];

/**
 * Whether or not we're currently processing an action from the queue.
 * @type {boolean}
 */
let busy = false;

/**
 * The player's current level/puzzle index.
 * @type {number}
 */
let level = 1;

/**
 * The player's current dialogue index.
 * @type {number}
 */
let step = 0;

/**
 * The set of cards that are currently unlocked current level.
 * @type {Set<CardType>}
 */
let unlocks = new Set();

/**
 * The hand contains the cards the player can actively play.
 */
let hand = Zone(UI_HAND_X, UI_HAND_Y, UI_HAND_COLS, UI_HAND_ROWS);

/**
 * The board is where cards are played.
 */
let board = Zone(UI_BOARD_X, UI_BOARD_Y, UI_BOARD_COLS, UI_BOARD_ROWS);

/**
 * The grave is where cards go if they die on the board.
 */
let grave = Zone(UI_GRAVE_X, UI_GRAVE_Y, UI_GRAVE_COLS, UI_GRAVE_ROWS);

/**
 * The reset button reverts the board back to the initial state.
 */
let resetButton = Button(
  UI_BUTTON_ANCHOR_X,
  UI_BUTTON_ANCHOR_Y,
  "RESET",
  PALETTE_BTN_SECONDARY,
);

/**
 * The next button advances through dialogue and moves to the next level.
 */
let nextButton = Button(UI_BUTTON_ANCHOR_X, UI_BUTTON_ANCHOR_Y, "NEXT");

/**
 * The next level button takes you to the next level.
 */
let nextLevelButton = Button(
  UI_PROGRESS_X + 20,
  UI_PROGRESS_Y - 3,
  ">",
  PALETTE_BTN_SECONDARY,
);

/**
 * The prev level button takes you to the previous level.
 */
let prevLevelButton = Button(
  UI_PROGRESS_X - 14,
  UI_PROGRESS_Y - 3,
  "<",
  PALETTE_BTN_SECONDARY,
);

/**
 * Banished is a special hidden slot that cards can go to when the grave is
 * full. There can be multiple cards here so don't trust the `card` property
 * for anything important.
 * @type {Slot}
 */
let banished = {
  zone: grave,
  x: -1,
  y: -1,
  bounds: Rect(0, 0, 0, 0),
  palette: 0,
};

/**
 * Check whether the pointer is currently over a specific rectangle.
 * @param {Rectangle} r
 * @returns {boolean}
 */
function hover(r) {
  return inside(r, pointer);
}

/**
 * Check whether a card matches a specific set of tags.
 * @param {Card} card
 * @param {number} tags
 * @returns {boolean}
 */
function is(card, tags) {
  return (card.tags & tags) > 0;
}

/**
 * Create a timer, returning a promise that resolves when the timer finishes.
 * @param {number} ms
 * @param {(t: number) => void} callback
 * @returns {Promise<void>}
 */
function timer(ms, callback) {
  return new Promise((done) => {
    timers.add({ elapsed: 0, duration: ms, callback, done });
  });
}

/**
 * Resize the canvas to fill the screen.
 */
function resize() {
  let s = Math.min(innerWidth / UI_W, innerHeight / UI_H);
  canvas.style.cssText = `position:fixed;inset:0;image-rendering:pixelated;width:${UI_W * s}px;height:${UI_H * s}px`;
}

/**
 * Updates the pointer state in response to pointer events.
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
 * Creates a button.
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @returns {Button}
 */
function Button(x, y, label, palette = PALETTE_BTN_PRIMARY) {
  let cap = spritesheet.btn.center.x;
  let w = cap + label.length * 4 + 1 + cap;
  let h = spritesheet.btn.h;
  let btn = {
    x,
    y,
    w,
    h,
    label,
    active: false,
    pressed: false,
    palette,
    paletteActive: palette + 1,
  };
  btn.x -= (w / 2) | 0;
  buttons.push(btn);
  return btn;
}

/**
 * Creates a grid-based zone for cards.
 * @param {number} x
 * @param {number} y
 * @param {number} cols
 * @param {number} rows
 * @param {number} palette
 * @returns {Zone}
 */
function Zone(x, y, cols, rows, palette = 12) {
  let s = UI_CELL_SIZE;
  let bounds = Rect(x, y, cols * s, rows * s);

  /**
   * @type {Zone}
   */
  let zone = { slots: [], bounds, cols, rows };

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let bounds = Rect(x + col * s, y + row * s, s, s);
      zone.slots.push({ zone, x: col, y: row, bounds, palette });
    }
  }

  return zone;
}

/**
 * Check whether a given card is locked.
 * @param {Card} card
 * @returns {boolean}
 */
function isLocked(card) {
  if (!is(card, GOD)) return false;
  return !unlocks.has(card.type);
}

/**
 * Enqueue an action to be performed asynchronously after the current actions
 * have finished processing.
 * @param {Action} action
 */
function queue(action) {
  actions.push(action);
}

/**
 * Check whether a given slot is empty.
 * @param {Slot} slot
 * @returns {boolean}
 */
function isEmpty(slot) {
  return slot.card === undefined;
}

/**
 * Check whether a given slot contains a card.
 * @param {Slot} slot
 * @returns {boolean}
 */
function isNotEmpty(slot) {
  return slot.card !== undefined;
}

/**
 * Go to the "next" step/level.
 */
function next() {
  if (hasClearedGiants()) {
    advanceToNextLevel();
  } else {
    step += 1;
  }
}

/**
 * Reset the board.
 */
function reset() {
  for (let card of cards) {
    despawn(card);
  }

  for (let card of cards) {
    if (card.startingSlot && !is(card, TRANSIENT)) {
      card.hp = card.startingHp;
      move(card, card.startingSlot);
    }
  }
}

/**
 * Encode the current state of the _board_ into a string.
 * @returns {string}
 */
function save() {
  return board.slots
    .map(({ card }) => {
      if (!card) return "-";
      let a = String.fromCharCode(65 + card.type);
      let b = Math.min(card.hp, 9);
      return a + b;
    })
    .join("")
    .replace(/-+$/, "");
}

/**
 * Load a saved state into the board.
 * @param {string} state
 */
function load(state) {
  let q = [...state];

  for (let slot of board.slots) {
    let type = (q.shift() || "").charCodeAt(0) - 65;
    if (isCardType(type)) {
      let hp = parseInt(required(q.shift())) || 0;
      spawn(type, slot, NONE, hp);
    }
  }
}

/**
 * Check whether a given number is a valid card type.
 * @param {number} n
 * @returns {n is CardType}
 */
function isCardType(n) {
  return n in CARDS;
}

/**
 * Spawn a card in a specific slot.
 * @param {CardType} type
 * @param {Slot} slot
 * @param {number} [tags]
 * @param {number} [hp]
 * @returns {Card}
 */
function spawn(type, slot, tags = NONE, hp) {
  let def = CARDS[type];
  let sprite = UI_CARD_SPRITES[def.sprite ?? type];
  hp ||= def.hp ?? 1;

  let card = (slot.card = {
    type,
    name: def.name,
    description: def.description ?? "",
    sprite,
    palette: def.palette ?? type,
    paletteDamage: def.paletteDamage ?? PALETTE_DAMAGE,
    slot,
    bounds: Rect(slot.bounds.x, slot.bounds.y, sprite.w, sprite.h),
    flashTimer: 0,
    hp,
    tags: (def.tags ?? GOD) | tags,
    targets: def.targets ?? GIANT,
    effect: def.effect ?? defaultAttackEffect,
    adjacency: def.adjacency ?? cardinals,
    startingSlot: slot,
    startingHp: hp,
  });
  cards.add(card);
  return card;
}

/**
 * Despawn/banish a card. This happens when the grave is full, or for special
 * case cards that skip the grave entirely.
 * @param {Card} card
 */
function despawn(card) {
  card.slot.card = undefined;
  card.slot = banished;
}

/**
 * Play a card on a specific slot. Usually a direct result of dragging the
 * card there from the hand.
 * @param {Card} card
 * @param {Slot} slot
 */
async function play(card, slot) {
  await move(card, slot);
  await trigger(card);
}

/**
 * Trigger the effect for a card.
 * @param {Card} card
 */
async function trigger(card) {
  await card.effect(card, adjacent(card, card.targets, card.adjacency));
}

/**
 * Returns the array of cards that match the tags and the adjacency rules for another card.
 * @param {Card} card
 * @param {number} tags
 * @returns {Card[]}
 */
function adjacent(card, tags = ALL, adjacency = cardinals) {
  let { slot } = card;
  return adjacency
    .map((d) => add(slot, d))
    .map((p) => at(slot.zone, p)?.card)
    .filter(exists)
    .filter((c) => is(c, tags));
}

/**
 * Find a slot in a zone from a coordinate.
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
 * Move a card to a specific slot with animations.
 * @param {Card} card
 * @param {Slot} slot
 */
function move(card, slot) {
  // Clear the card's existing slot, but only if the card is still here.
  if (card.slot.card === card) card.slot.card = undefined;

  card.slot = slot;
  slot.card = card;
  return tween(card, slot);
}

/**
 * Swap the cards in two slots and retrigger if either are gods.
 * @param {Slot} a
 * @param {Slot} b
 */
async function swap(a, b) {
  let cardA = a.card;
  let cardB = b.card;
  await Promise.all([cardA && move(cardA, b), cardB && move(cardB, a)]);
  if (cardA && is(cardA, GOD)) await trigger(cardA);
  if (cardB && is(cardB, GOD)) await trigger(cardB);
}

/**
 * Animate a card to a specific slot.
 * @param {Card} card
 * @param {Slot} slot
 */
function tween(card, slot, ms = UI_CARD_ANIMATION_MS) {
  let { x: x0, y: y0 } = card.bounds;
  let { x: x1, y: y1 } = slot.bounds;

  return timer(ms, (t) => {
    let k = smoothstep(t * t);
    card.bounds.x = lerp(x0, x1, k);
    card.bounds.y = lerp(y0, y1, k);
  });
}

/**
 * Create a single particle.
 * @param {Partial<Particle>} p
 */
function emit(p) {
  particles.add({
    x: 0,
    y: 0,
    vx: random(-10, 10),
    vy: random(-10, 10),
    sprite: pick([spritesheet.particle_1, spritesheet.particle_2]),
    duration: random(300, 800),
    elapsed: 0,
    floor: Infinity,
    mass: random(1, 5),
    palette: 0,
    ...p,
  });
}

/**
 * @param {Card} card
 * @param {Card[]} targets
 */
async function defaultAttackEffect(card, targets) {
  for (let target of targets) {
    await attack(card, target);
  }
}

/**
 * Perform an animated attack from one card to another.
 * @param {Card} card
 * @param {Card} target
 */
async function attack(card, target) {
  if (card.hp <= 0) return;
  if (target.slot.zone !== board) return;
  await tween(card, target.slot, UI_ATTACK_MS);
  sfx(SFX_SLASH);
  target.flashTimer = UI_ATTACK_MS;
  showBloodSplatter(card, target);
  let dead = --target.hp <= 0;
  if (dead) await die(target, card);
  await tween(card, card.slot, UI_ATTACK_MS);
  // Giants retaliate after being attacked.
  if (is(target, GIANT)) queue(() => trigger(target));
}

/**
 * Recall a card back to your hand.
 * @param {Card} card
 */
async function summon(card) {
  let slot = card.startingSlot;
  if (!slot || !isEmpty(slot)) {
    slot = hand.slots.find(isEmpty);
  }
  if (slot) return move(card, slot);
}

/**
 * Push a target away from card, retriggering its effect if necessary.
 * @param {Card} card
 * @param {Card} target
 * @param {boolean} [force]
 */
async function push(card, target, force = false) {
  if (!force && (card.hp <= 0 || target.hp <= 0)) return;
  let dir = sub(target.slot, card.slot);
  let slot = at(board, add(target.slot, dir));
  if (slot?.card) return;
  if (slot) return is(target, GOD) ? play(target, slot) : move(target, slot);
}

/**
 * Die and attempt to move to the grave.
 * @param {Card} card
 * @param {Card} [killer]
 */
async function die(card, killer) {
  if (card.slot.zone !== board) return;

  if (card.type === BLAST_CRYSTAL) {
    for (let target of adjacent(card)) {
      await push(card, target, true);
    }
  }

  if (!is(card, GOD | GIANT)) return despawn(card);

  showBoneTumble(card.slot);

  let slot = grave.slots.find(isEmpty);
  slot ? move(card, slot) : despawn(card);
}

/**
 * @returns {Dialogue[]}
 */
function getDialogue() {
  let [, , ...dialogue] = LEVELS[level];
  return dialogue;
}

/**
 * Check whether the board has been cleared of giants.
 * @returns {boolean}
 */
function hasClearedGiants() {
  for (let card of cards) {
    if (is(card, GIANT) && card.slot.zone === board) {
      return false;
    }
  }
  return true;
}

/**
 * @param {number} n
 */
function loadLevel(n) {
  if (!(n in LEVELS)) return;
  level = n;

  /**
   * @type {Partial<Record<CardType, Rectangle>>}
   */
  let prevPositions = {};

  for (let card of cards) {
    prevPositions[card.type] = card.bounds;
    despawn(card);
  }

  cards.clear();

  let [puzzle, characters] = LEVELS[level];
  unlocks = new Set(characters);
  step = 0;
  start(puzzle);
  location.hash = `${level}`;

  // Visually animate gods back to the hand from their previous positions
  // on the board or in the grave etc.
  for (let card of cards) {
    let pos = prevPositions[card.type];
    if (!pos || !is(card, GOD)) continue;
    card.bounds.x = pos.x;
    card.bounds.y = pos.y;
    tween(card, card.slot);
  }
}

/**
 * Move to the next level.
 */
function advanceToNextLevel() {
  loadLevel(level + 1);
}

/**
 * @param {Card} card
 * @param {Card} target
 */
function showBloodSplatter(card, target) {
  let dir = sub(target.slot.bounds, card.slot.bounds);
  let count = random(3, 10);
  for (let i = 0; i < count; i++) {
    let { x, y } = anchor(target.slot.bounds, random(), random());
    let angle = Math.atan2(dir.x, dir.y) + random(-0.5, 0.5);
    let speed = random(10, 60);
    let vx = Math.sin(angle) * speed;
    let vy = Math.cos(angle) * speed;
    let palette = target.paletteDamage;
    emit({ x, y, vx, vy, palette });
  }
}

/**
 * @param {Slot} slot
 */
function showBoneTumble(slot) {
  let count = random(3, 6);
  for (let i = 0; i < count; i++) {
    let { x, y } = anchor(slot.bounds, 0.5, 0.5);
    let angle = random(0, -DEG_180);
    let speed = random(10, 60);
    let vx = Math.sin(angle) * speed;
    let vy = Math.cos(angle) * speed;
    let floor = y + random(10, 15);
    let sprite = spritesheet.particle_bone;
    emit({ x, y, vx, vy, sprite, floor, palette: PALETTE_WHITE });
  }
}

function renderCloudBand(jitter = 30, palette = 0) {
  let rng = prng();
  let count = 500;
  let speed = pt / 100;
  let sprites = [spritesheet.gas_1, spritesheet.gas_2, spritesheet.gas_3];
  let freq = 1;
  let amplitude = -50;

  for (let i = 0; i < count; i++) {
    let x = (rng(0, UI_W) + speed) % UI_W;
    let step = x / UI_W;
    let y =
      UI_H / 2 +
      50 +
      Math.sin(step * Math.PI * freq) * amplitude +
      rng() * rng(-jitter, jitter);
    let s = rng(0, sprites.length) | 0;
    draw(sprites[s], x, y, palette);
  }
}

let starSprites = [spritesheet.star_3];
for (let i = 0; i < 30; i++)
  starSprites.push(spritesheet.star_1, spritesheet.star_2);

function renderStars() {
  let rng = prng();
  let count = rng(200, 800);

  for (let i = 0; i < count; i++) {
    let x = rng(0, UI_W);
    let y = rng(11, UI_H - 11);
    let s = rng(0, starSprites.length) | 0;
    let period = rng(1000, 10_000);
    let spr = starSprites[s];
    let palette = PALETTE_FROST_GIANT;
    if (rng() < 0.01) palette = PALETTE_FRIGG;
    let time = (pt % period) / period;
    ctx.globalAlpha = Math.sin(time * Math.PI);
    draw(spr, x, y, palette);
  }

  ctx.globalAlpha = 1;
}

function renderBackground() {
  renderCloudBand(50, 21);
  renderCloudBand(20, 22);
  renderCloudBand(10, 23);
  renderStars();

  let spr = spritesheet.runes;
  for (let x = 0; x < UI_W; x += spr.w) {
    draw(spr, x, 1);
    draw(spr, x, UI_H - spr.h - 1);
  }
}

/**
 * @param {Zone} zone
 */
function renderZoneSlots(zone) {
  for (let slot of zone.slots) {
    draw(spritesheet.card_slot, slot.bounds.x, slot.bounds.y, slot.palette);
  }
}

/**
 * @param {Zone} zone
 */
function renderZoneCards(zone) {
  for (let slot of zone.slots) {
    if (slot.card && slot.card !== drag?.card) {
      renderCard(slot.card);
    }
  }
}

/**
 * @param {Card} card
 */
function renderCard(card) {
  let { x, y } = card.bounds;
  let palette = card.flashTimer > 0 ? 10 : card.palette;
  let locked = isLocked(card);
  let targeted = targets.has(card);
  draw(spritesheet.card, x, y, card.palette);
  draw(card.sprite, x, y, locked ? PALETTE_BLACK : palette);
  if (targeted) draw(card.sprite, card.bounds.x, card.bounds.y, 25);
  if (locked) {
    draw(spritesheet.lock, x + 6, y + 10, card.palette);
  } else if (card.hp > 0) {
    write(`${card.hp}`, x + 8, y + 13);
  }
}

/**
 * @param {Card} card
 */
function renderPreview(card) {
  let x = UI_TIP_X;
  let y = UI_TIP_Y;
  draw(card.sprite, x + 2, y + 2, card.palette);
  write(card.name, x + UI_CARD_SIZE + 4, y + 4, 1);
  write(card.description, x + UI_CARD_SIZE + 4, y + 12);
}

/**
 * @param {Button} button
 */
function renderButton(button) {
  let { x, y, w, h, active } = button;
  let palette = active ? button.paletteActive : button.palette;
  let sprite = spritesheet.btn;
  if (down && active) y += 1;
  drawNinePatch(sprite, x, y, w, h, palette);
  write(button.label, x + sprite.center.x + 1, y + 3);
}

function renderCursor() {
  if (IS_MOBILE) return;
  let sprite = UI_CURSOR_SPRITES[cursor];
  draw(sprite, pointer.x - UI_CURSOR_PIVOT_X, pointer.y - UI_CURSOR_PIVOT_Y);
}

function renderParticles() {
  for (let p of particles) {
    draw(p.sprite, p.x, p.y, p.palette);
  }
}

function renderDialogue() {
  let story = getDialogue();
  if (!story.length || step >= story.length) return;

  let x = UI_DIALOGUE_X;
  let y = UI_DIALOGUE_Y;
  let w = UI_DIALOGUE_WIDTH;
  let h = UI_DIALOGUE_HEIGHT;
  let [char, text] = story[step];
  let card = CARDS[char];
  let sprite = UI_CARD_SPRITES[card.sprite ?? char];
  drawNinePatch(spritesheet.frame, x, y, w, h, card.palette ?? char);
  draw(sprite, x + 3, y + 4, card.palette ?? char);
  write(card.name, x + UI_CARD_SIZE + 4, y + 4, 1);
  write(text, x + UI_CARD_SIZE + 4, y + 10);
}

function renderProgress() {
  let label = `${level}`;
  let w = label.length * 4;
  let h = UI_PROGRESS_H;
  let x = UI_CENTER_X - w / 2;
  let y = UI_PROGRESS_Y;
  //drawNinePatch(spritesheet.frame, x - 4, y - 4, w + 7, h, PALETTE_FROST_GIANT);
  write(label, x, y);
}

/**
 * @param {Rectangle} rect
 */
function renderTutorialPointer(rect) {
  ctx.save();
  ctx.globalAlpha = 0.75;
  let cursor = CURSOR_POINTER;
  let sprite = UI_CURSOR_SPRITES[cursor];
  let x = rect.x + (rect.w - sprite.w) / 2;
  let y = rect.y + rect.h + Math.sin(pt / 100) * 2;
  draw(sprite, x, y);
  ctx.restore();
}

function renderTutorial() {
  if (IS_EDITOR) return;

  ctx.save();
  ctx.globalAlpha = 1;

  if (level === 1 && actions.length === 0) {
    let src = hand.slots[0];
    let dst = board.slots[17];

    if (step < getDialogue().length) {
      renderTutorialPointer(nextButton);
    } else if (drag) {
      renderTutorialPointer(dst.bounds);
    } else if (src.card) {
      renderTutorialPointer(src.bounds);
    } else {
      renderTutorialPointer(nextButton);
    }
  }

  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, UI_W, UI_H);
  renderBackground();

  let story = getDialogue();
  let hasDialogue = story.length && step < story.length;

  if (!preview) {
    if (hasDialogue || hasClearedGiants()) {
      renderButton(nextButton);
    } else {
      renderButton(resetButton);
    }
  }

  renderProgress();

  if (pointer.y < UI_PROGRESS_Y + 10 || IS_MOBILE) {
    renderButton(nextLevelButton);
    renderButton(prevLevelButton);
  }

  drawNinePatch(
    spritesheet.frame,
    UI_BOARD_X - 4,
    UI_BOARD_Y - 4,
    UI_BOARD_W + 6,
    UI_BOARD_H + 6,
    PALETTE_BTN_PRIMARY_ACTIVE,
  );
  renderZoneSlots(grave);
  renderZoneSlots(board);
  renderZoneSlots(hand);
  renderZoneCards(grave);
  renderZoneCards(board);
  renderZoneCards(hand);
  renderDialogue();
  if (preview) renderPreview(preview);
  if (drag) renderCard(drag.card);
  renderParticles();
  renderTutorial();
  renderCursor();
}

async function updateActions() {
  if (busy || actions.length) refresh = true;
  if (busy) return;
  let action = actions.shift();
  if (!action) return;
  busy = true;
  await action();
  busy = false;
  refresh = true;
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

function updateParticles() {
  for (let p of particles) {
    refresh = true;
    let step = dt / 1000;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += p.mass;
    if (p.y > p.floor) {
      p.y = p.floor;
      p.vy *= -1;
    }
    if ((p.elapsed += dt) > p.duration) {
      particles.delete(p);
    }
  }
}

function updateButtons() {
  for (let b of buttons) {
    b.active = !drag && hover(b);
    b.pressed = pressed && b.active;
    if (b.active) cursor = CURSOR_POINTER;
    if (b.pressed) sfx(SFX_CLICK);
  }
}

function updateDrag() {
  if (drag) {
    let { card, offset } = drag;
    let slot = board.slots.find((s) => hover(s.bounds));

    if (released && slot && !slot.card) {
      queue(() => play(card, slot));
      sfx(SFX_TAP);
    } else if (released) {
      tween(card, card.slot);
    } else if (slot && !slot.card) {
      // Snap to slot
      card.bounds.x = slot.bounds.x;
      card.bounds.y = slot.bounds.y;
    } else {
      card.bounds.x = pointer.x - offset.x;
      card.bounds.y = pointer.y - offset.y;
    }
  } else {
    for (let { card } of hand.slots) {
      if (card && hover(card.bounds) && !isLocked(card)) {
        if (pressed) {
          let offset = sub(pointer, card.bounds);
          drag = { card, offset };
          sfx(SFX_TAP);
        } else {
          cursor = CURSOR_GRAB;
        }
      }
    }
  }

  if (released) drag = undefined;
  if (drag) cursor = CURSOR_GRABBING;
}

function updateTargets() {
  targets.clear();

  let card = drag?.card;
  let slot = board.slots.find((s) => hover(s.bounds));
  if (!card || !slot || slot.card) return;

  for (let dir of card.adjacency) {
    let target = at(board, add(slot, dir))?.card;
    if (target && is(target, card.targets)) targets.add(target);
  }
}

function updateCards() {
  preview = undefined;

  for (let card of cards) {
    if (card.flashTimer > 0) {
      card.flashTimer -= dt;
      refresh = true;
    }

    if (hover(card.bounds) && !isLocked(card)) {
      preview = card;
    }

    if (card.type === GJALLARHORN) {
      if (random() < 0.1) {
        let b = card.bounds;
        let x = b.x + random(b.w);
        let y = b.y + random(b.h);
        let sprite = pick([spritesheet.star_2, spritesheet.star_4]);
        let palette = pick([PALETTE_ODIN, PALETTE_WHITE]);
        emit({ x, y, sprite, palette, mass: -0.2 });
      }
    }
  }

  if (
    // No previews during dialogue
    step < getDialogue().length ||
    // No god previews in first 2 levels
    (level <= 2 && preview?.slot.zone === hand && !IS_EDITOR)
  ) {
    preview = undefined;
  }
}

function update() {
  cursor = CURSOR_DEFAULT;
  updateActions();
  updateTimers();
  updateParticles();
  updateDrag();
  updateTargets();
  updateButtons();
  updateCards();
  if (nextButton.pressed) next();
  if (resetButton.pressed) reset();
  if (nextLevelButton.pressed) loadLevel(level + 1);
  if (prevLevelButton.pressed) loadLevel(level - 1);
  if (busy) preview = undefined;
}

function loop(now = pt) {
  requestAnimationFrame(loop);

  pt ||= now;
  dt = now - pt;
  pt = now;

  update();

  refresh = true;
  refresh && render();
  refresh = false;

  pressed = false;
  released = false;
  _down = down;
}

function generateLevel() {
  return range(0, board.slots.length)
    .map(() => {
      if (Math.random() < 0.3) return "-";
      if (Math.random() < 0.6) return "I0";
      let hp = Math.floor(Math.random() * Math.random() * 6);
      let char = Math.random() < 0.7 ? "J" : "K";
      if (Math.random() < 0.1) char = "L";
      return char + hp;
    })
    .join("");
}

/**
 * @param {string} state
 */
function start(state) {
  load(state);
  spawn(HEIMDALL, hand.slots[0]);
  spawn(THOR, hand.slots[1]);
  spawn(TYR, hand.slots[2]);
  spawn(FRIGG, hand.slots[3]);
  spawn(HEL, hand.slots[4]);
  spawn(LOKI, hand.slots[5]);
  spawn(ODIN, hand.slots[6]);
}

function init() {
  let state = location.hash.slice(1);

  if (state === "random") {
    state = generateLevel();
    location.hash = state;
  }

  if (IS_EDITOR) {
    state ||= "-".repeat(board.slots.length);
  }

  if (parseInt(state) >= 0) {
    level = parseInt(state);
    state = "";
  }

  if (state) {
    step = Infinity; // skip dialogue
    unlocks = new Set([HEIMDALL, THOR, TYR, FRIGG, HEL, LOKI, ODIN]);
    start(state);
  } else {
    let [puzzle, characters] = LEVELS[level];
    unlocks = new Set(characters);
    start(puzzle);
  }

  canvas.width = UI_W;
  canvas.height = UI_H;
  ctx.imageSmoothingEnabled = false;

  onpointerdown = onpointermove = onpointerup = onPointerEvent;
  onresize = resize;

  document.title = "Gjallarhorn";
  document.body.style.cssText = `background:${UI_BG};cursor:none;touch-action:none`;
  document.body.append(canvas);

  document.head.innerHTML += `
    <link rel="icon" href="${spriteToDataUrl(UI_CARD_SPRITES[1])}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  `;

  resize();
  loop();
}

if (IS_EDITOR) {
  /**
   * @param {Slot} slot
   */
  function erase(slot) {
    if (slot.card) {
      cards.delete(slot.card);
      slot.card = undefined;
    }
  }

  onkeydown = ({ key, metaKey }) => {
    // Ignore system shortcuts
    if (metaKey) return;

    let slot = board.slots.find((s) => inside(s.bounds, pointer));
    let card = slot?.card;

    // shift + number keys set health for the card under the cursor.
    let shifted = ")!@£$%^&*()";

    if (key === "R") {
      location.hash = "#random";
      location.reload();
    }

    /**
     * @type {Record<string, CardType>}
     */
    let shortcuts = {
      1: FROST_CRYSTAL,
      2: FROST_GIANT,
      3: FIRE_GIANT,
      4: CHAOS_GIANT,
      5: GJALLARHORN,
      6: YMIR,
      7: BLAST_CRYSTAL,
    };

    if (!slot) return;
    else if (card && shifted.includes(key)) card.hp = shifted.indexOf(key);
    else if (key === "x" || key === "Escape") erase(slot);
    else if (key in shortcuts) spawn(shortcuts[key], slot);
    else return;

    location.hash = save();
    refresh = true;
  };
}

init();
