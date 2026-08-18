// @ts-check

/**
 * These are the reusable functions and values that I copy into all the games I
 * build.
 */

/**
 * @typedef {object} Point
 * @prop {number} x
 * @prop {number} y
 */

/**
 * @typedef {object} Vector
 * @prop {number} x
 * @prop {number} y
 */

/**
 * @typedef {object} Rectangle
 * @prop {number} x
 * @prop {number} y
 * @prop {number} w
 * @prop {number} h
 */

/**
 * @typedef {object} Font
 * @prop {boolean} ready
 * @prop {string} charset
 * @prop {HTMLImageElement} image
 * @prop {Rectangle} bounds
 * @prop {Rectangle[]} glyphs
 * @prop {number} lineHeight
 * @prop {number} letterSpacing
 * @prop {Record<string, number>} kerning
 * @prop {number} missingCharCode
 */

/**
 * Whether or not we're running in a browser.
 */
export const isBrowser = typeof document !== "undefined";

/**
 * A stand-in type to use when a value can't be provided due to it requiring
 * a browser environment, but where I deliberately _don't_ want to make it
 * nullable, which usually creates a ton of checks and noise in functions that
 * are only ever called inside a browser.
 *
 * @type {any}
 */
const unsupported = undefined;

/**
 * @type {HTMLCanvasElement}
 */
export const canvas = isBrowser
  ? document.createElement("canvas")
  : unsupported;

/**
 * @type {CanvasRenderingContext2D}
 */
export const ctx = canvas ? required(canvas.getContext("2d")) : unsupported;

/**
 * The pointer's current state in screen space (e.g. relative to the canvas).
 */
export const pointer = {
  x: -1e10,
  y: -1e10,
  /**
   * The buttons that are currently pressed.
   */
  buttons: 0,
  /**
   * That buttons that were pressed this frame.
   */
  pressed: 0,
  /**
   * That buttons that were released this frame.
   */
  released: 0,
  /**
   * X distance the pointer moved this frame.
   */
  dx: 0,
  /**
   * Y distance the pointer moved this frame.
   */
  dy: 0,
};

export const keyboard = {
  /**
   * The keys that are currently down.
   * @type {Set<string>}
   */
  down: new Set(),
  /**
   * The keys that were pressed this frame.
   * @type {Set<string>}
   */
  pressed: new Set(),
  /**
   * The keys that were released this frame.
   * @type {Set<string>}
   */
  released: new Set(),
};

/**
 * Whether or not the game is running.
 */
let running = false;

/**
 * Whether or not we need to render during the current frame.
 */
let redraw = true;

/**
 * The number of milliseconds that the engine has processed so far.
 */
export let time = 0;

/**
 * The number of milliseconds since the last frame.
 */
export let dt = 0;

/**
 * Request a redraw.
 */
export function refresh() {
  redraw = true;
}

/**
 * Throws an error if `condition` is not truthy.
 * @param {any} condition
 * @param {string} [message]
 * @returns {asserts condition}
 */
export function assert(condition, message = "assert") {
  if (!condition) {
    let error = new Error(message);
    // @ts-ignore (not part of the spec)
    Error.captureStackTrace?.(error, assert);
    throw error;
  }
}

/**
 * Returns `value` if it is non-nullable, otherwise throws an error.
 *
 * Useful as an alternative to the non-null assertion operator (!) which
 * actually throws instead of just failing silently.
 *
 * @template Value
 * @param {Value} value
 * @param {string} [message]
 * @returns {NonNullable<Value>}
 */
export function required(value, message = "required") {
  if (value == null) {
    let error = new Error(message);
    // @ts-ignore (not part of the spec)
    Error.captureStackTrace?.(error, required);
    throw error;
  }
  return value;
}

/**
 * Mark a branch as unreachable and optionally pass a `never` value to enforce
 * it in the type system.
 * @param {never} [value]
 * @param {string} [message]
 * @returns {never}
 */
export function unreachable(value, message = "unreachable") {
  let error = new Error(message);
  // @ts-ignore (not part of the spec)
  Error.captureStackTrace?.(error, unreachable);
  throw error;
}

/**
 * Type guard for checking whether a value is _not_ null or undefined.
 * @template T
 * @param {T} value
 * @returns {value is NonNullable<T>}
 */
export function exists(value) {
  return value != null;
}

/**
 * Type guard for checking whether an array has at least one element.
 * @template Value
 * @param {Value[]} array
 * @returns {array is [Value, ...Value[]]}
 */
export function nonempty(array) {
  return array.length > 0;
}

/**
 * Return a deduplicated version of the array where all values are unique.
 * @template T
 * @param {T[]} array
 * @return {T[]}
 */
export function unique(array) {
  return Array.from(new Set(array));
}

/**
 * Returns an array containing all the integers between lo and hi.
 * @param {number} lo A positive integer (inclusive).
 * @param {number} hi A positive integer (exclusive).
 * @returns {number[]}
 */
export function range(lo, hi) {
  return Array.from({ length: hi - lo }).map((_, i) => lo + i);
}

/**
 * Remove all instances of an element from an array, returning the new array.
 * @template T
 * @param {T[]} array
 * @param {T} value
 */
export function remove(array, value) {
  return array.filter((elem) => elem !== value);
}

/**
 * Find the lowest scoring item in an array.
 * @template T
 * @param {T[]} array
 * @param {(item: T) => number} func
 * @returns {T | undefined}
 */
export function smallest(array, func) {
  let minScore = Infinity;
  let minValue = array[0];

  for (let value of array) {
    let score = func(value);
    if (score < minScore) {
      minValue = value;
      minScore = score;
    }
  }

  return minValue;
}

/**
 * Find the highest scoring item in an array.
 * @template T
 * @param {T[]} array
 * @param {(item: T) => number} func
 * @returns {T | undefined}
 */
export function largest(array, func) {
  let maxScore = -Infinity;
  let maxValue = array[0];

  for (let value of array) {
    let score = func(value);
    if (score > maxScore) {
      maxValue = value;
      maxScore = score;
    }
  }

  return maxValue;
}

/**
 * Linear interpolation between two values.
 * @param {number} a The start value.
 * @param {number} b The end value.
 * @param {number} k The control value.
 * @returns {number} The interpolated value.
 */
export function lerp(a, b, k) {
  return a + (b - a) * k;
}

/**
 * Inverse linear interpolation between two values.
 * @param {number} a The start value.
 * @param {number} b The end value.
 * @param {number} v The control value.
 * @returns {number} The normalized value.
 */
export function unlerp(a, b, v) {
  return (v - a) / (b - a);
}

/**
 * Clamp a number to fit within a range.
 * @param {number} min Minimum allowed value.
 * @param {number} max Maximum allowed value.
 * @param {number} value The value to clamp.
 * @returns {number} The clamped value.
 */
export function clamp(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Modulo that works with negative numbers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
export function mod(a, b) {
  return ((a % b) + b) % b;
}

/**
 * Round a number to the nearest step.
 * @param {number} value
 * @param {number} step
 */
export function snap(value, step) {
  return Math.round(value / step) * step;
}

/**
 * Convert degrees to radians.
 * @param {number} deg
 * @returns {number}
 */
export function degrees(deg) {
  return (deg / 360) * (Math.PI * 2);
}

/**
 * Vectors representing the compass directions.
 */
export const dirs = {
  N: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  S: { x: 0, y: 1 },
  W: { x: -1, y: 0 },
  NW: { x: -1, y: -1 },
  NE: { x: 1, y: -1 },
  SE: { x: 1, y: 1 },
  SW: { x: -1, y: 1 },
};

/**
 * The four cardinal directions (Von-neuman neighbourhood).
 * @type {[Vector, Vector, Vector, Vector]}
 */
export const dirs4 = [dirs.N, dirs.E, dirs.S, dirs.W];

/**
 * The eight cardinal + intercardinal directions (Moore neighbourhood).
 * @type {[Vector, Vector, Vector, Vector, Vector, Vector, Vector, Vector]}
 */
export const dirs8 = [
  dirs.NW,
  dirs.N,
  dirs.NE,
  dirs.W,
  dirs.E,
  dirs.SW,
  dirs.S,
  dirs.SE,
];

/**
 * Return the neighbours positions around a point on a grid.
 * @param {Point} point
 * @param {4 | 8} [topology]
 * @returns {Point[]}
 */
export function adjacent(point, topology = 4) {
  return (topology === 4 ? dirs4 : dirs8).map((d) => ({
    x: point.x + d.x,
    y: point.y + d.y,
  }));
}

/**
 * Calculate the taxicab/manhattan distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function taxicab(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Calculate the euclidean/pythagorean distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function euclidean(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Calculate the chebyshev/king distance between two points.
 * @param {Point} a
 * @param {Point} b
 * @returns {number}
 */
export function chebyshev(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/**
 * Create a rectangle.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {Rectangle}
 */
export function R(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Check whether a rectangle contains a specific point.
 * @param {Rectangle} r
 * @param {Point} p
 * @returns {boolean}
 */
export function inside(r, p) {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
}

/**
 * Check whether rectangles overlap.
 * @param {Rectangle} r1
 * @param {Rectangle} r2
 * @returns {boolean}
 */
export function overlaps(r1, r2) {
  return (
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y
  );
}

/**
 * Slice a rectangle into a strip of sub-rectangles. Useful for creating
 * sprites from a parent sprite.
 * @param {Rectangle} rect
 * @param {number} w
 * @param {number} h
 */
export function strip(rect, w = rect.h, h = rect.h) {
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
 * Create a vector from two numbers.
 * @param {number} x
 * @param {number} y
 * @returns {Vector}
 */
export function V(x, y) {
  return { x, y };
}

/**
 * Sum two vectors and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract `b` from `a` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiply `a` by `b` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function mul(a, b) {
  return { x: a.x * b.x, y: a.y * b.y };
}

/**
 * Divide `a` by `b` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function div(a, b) {
  return { x: a.x / b.x, y: a.y / b.y };
}

/**
 * Find the magnitude of a vector.
 * @param {Vector} v
 * @returns {number}
 */
export function mag(v) {
  return Math.hypot(v.x, v.y);
}

/**
 * Scale a vector by a scalar value.
 * @param {Vector} v
 * @param {number} s
 * @returns {Vector}
 */
export function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

/**
 * Calculate the dot product of two vectors.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

/**
 * Calculate the cross product of two vectors.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {number}
 */
export function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

/**
 * Get the normalized unit vector for `vec`.
 * @param {Vector} v
 * @returns {Vector}
 */
export function norm(v) {
  let m = mag(v);
  return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

/**
 * Turn a vector into an angle in radians.
 * @param {Vector} v
 * @returns {number}
 */
export function angle(v) {
  return Math.atan2(v.y, v.x);
}

/**
 * Get the direction vector between two points. Useful for finding the next
 * step to take towards a target.
 * @param {Point} a
 * @param {Point} b
 * @returns {Vector}
 */
export function towards(a, b) {
  return { x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) };
}

/**
 * Rotate one vector by another.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function rotate(a, b) {
  return {
    x: a.x * -b.y + a.y * b.x,
    y: a.x * b.x + a.y * b.y,
  };
}

/**
 * Calculate a cheap hash from a string.
 * @param {string} str
 * @return {number}
 */
export function hash(str) {
  // DJB2: https://www.cse.yorku.ca/~oz/hash.html
  let len = str.length;
  let h = 5381;

  for (let i = 0; i < len; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }

  return h >>> 0;
}

/**
 * The internal state of the random number generator.
 */
let _seed = 0x123456789;

/**
 * Seed the random number generator.
 * @param {string | number} value
 */
export function seed(value) {
  // Hash the seed so that using similar seeds (e.g. time in ms) gives
  // noticeably different random values.
  _seed = hash(value.toString()) % 2147483647;
}

/**
 * Returns random floating point values between 0 and 1.
 */
export function random() {
  _seed = (_seed * 48271) % 2147483647;
  return _seed / 2147483647;
}

/**
 * Return a random integer between min (inclusive) and max (exclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randi(min, max) {
  return Math.trunc(min + random() * (max - min));
}

/**
 * Return a random float between min (inclusive) and max (exclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randf(min, max) {
  return min + random() * (max - min);
}

/**
 * Return a random item from a non-empty array.
 * @template Value
 * @overload
 * @param {[Value, ...Value[]]} array
 * @returns {Value}
 */

/**
 * Return a random item from an array. Returns undefined if the array is empty.
 * @template Value
 * @overload
 * @param {ArrayLike<Value>} array
 * @returns {Value | undefined}
 */

/**
 * @template Value
 * @param {ArrayLike<Value>} array
 * @returns {Value | undefined}
 */
export function pick(array) {
  return array[Math.floor(random() * array.length)];
}

/**
 * Roll a number of dice then return the summed total.
 * @param {number} n Number of dice to roll.
 * @param {number} sides Number of sides on the dice.
 * @return {number}
 */
export function roll(n, sides) {
  n = Math.max(n, 0);

  let total = 0;

  for (let i = 0; i < n; i++) {
    total += Math.floor(random() * sides) + 1;
  }

  return total;
}

/**
 * Returns a shuffled copy of an array.
 * @template Value
 * @param {Value[]} array
 * @return {Value[]}
 */
export function shuffle(array) {
  array = [...array];

  for (let i = 1; i < array.length; i++) {
    let j = Math.round(random() * i);
    let a = required(array[i]);
    let b = required(array[j]);
    array[i] = b;
    array[j] = a;
  }

  return array;
}

/**
 * Select a random value from a weighted array. Each item in the array should
 * be 2-element array containing a numeric weight and an item.
 * @template Value
 * @param {[weight: number, value: Value][]} items
 * @return {Value}
 */
export function weighted(items) {
  assert(items.length > 0, "items must not be empty");

  let total = 0;

  for (let [weight] of items) {
    total += weight;
  }

  let rand = random() * total;
  let sum = 0;

  for (let [weight, value] of items) {
    sum += weight;

    if (rand < sum) {
      return value;
    }
  }

  unreachable();
}

/**
 * Returns an array of all the points required to rasterize a line between
 * two points using Bresenham's line drawing algorithm.
 *
 * @param {Point} a
 * @param {Point} b
 * @returns {Point[]}
 */
export function bresenham({ x: x0, y: y0 }, { x: x1, y: y1 }) {
  if (!isFinite(x0) || !isFinite(y0) || !isFinite(x1) || !isFinite(y1))
    return [];

  // https://zingl.github.io/bresenham.html
  let dx = Math.abs(x1 - x0);
  let sx = x0 < x1 ? 1 : -1;
  let dy = -Math.abs(y1 - y0);
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;

  /** @type {Point[]} */
  let points = [];

  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    let e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }

  return points;
}

/**
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {Point[]}
 */
export function circle(cx, cy, r) {
  /** @type {Point[]} */
  let points = [];
  let x = r;
  let y = 0;
  let p = 1 - r;
  let err = 2 - 2 * r;
  while (true) {
    points.push(V(cx - x, cy + y));
    points.push(V(cx - y, cy - x));
    points.push(V(cx + x, cy - y));
    points.push(V(cx + y, cy + x));
    r = err;
    if (r <= y) err += ++y * 2 + 1;
    if (r < x || err > y) err += ++x * 2 + 1;
    if (cx < 0) break;
  }
  return points;
}

/**
 * Perform a depth first search from a start node.
 *
 * @template Node
 * @param {Node} start
 * @param {(node: Node) => Node[]} neighbours
 * @returns {Generator<Node, void>}
 */
export function* dfs(start, neighbours) {
  let queue = [start];
  /** @type {Set<Node>} */
  let visited = new Set();

  while (queue.length) {
    let node = queue.pop();
    if (!node) break;
    if (visited.has(node)) continue;
    visited.add(node);
    queue.push(...neighbours(node));
    yield node;
  }
}

/**
 * Perform a breadth first search from a start node.
 *
 * @template Node
 * @param {Node} start
 * @param {(node: Node) => Node[]} neighbours
 * @returns {Generator<Node, void>}
 */
export function* bfs(start, neighbours) {
  let queue = [start];
  /** @type {Set<Node>} */
  let visited = new Set();

  while (queue.length) {
    let node = queue.shift();
    if (!node) break;
    if (visited.has(node)) continue;
    visited.add(node);
    queue.push(...neighbours(node));
    yield node;
  }
}

/**
 * Completely traverse a graph using Dijkstra's algorithm to find the shortest
 * paths.
 *
 * @template Node
 * @param {Node} start The node to start the traversal from.
 * @param {(node: Node) => Node[]} neighbours A function which returns the neighbours for a given node.
 * @param {(node: Node) => number} cost A function which returns the traversal cost of a specific node.
 */
export function dijkstra(start, neighbours, cost = () => 1) {
  // Dijkstra's algorithm adapted from:
  // https://www.redblobgames.com/pathfinding/a-star/introduction.html

  /** @type {{ node: Node, priority: number }[]} */
  let queue = [{ node: start, priority: 0 }];

  /** @type {Map<Node, Node>} */
  let paths = new Map();

  /** @type {Map<Node, number>} */
  let costs = new Map([[start, 0]]);

  while (queue.length) {
    let current = required(queue.shift()).node;

    for (let next of neighbours(current)) {
      let oldCost = costs.get(next) ?? Infinity;
      let newCost = (costs.get(current) ?? 0) + cost(next);

      if (newCost < oldCost) {
        costs.set(next, newCost);
        paths.set(next, current);
        // Pretend we actually have a priority queue and that this isn't slow.
        queue.push({ node: next, priority: newCost });
        queue.sort((a, b) => a.priority - b.priority);
      }
    }
  }

  return { paths, costs };
}

/**
 * Find the shortest path to a given node using A*.
 *
 * @template Node
 * @param {object} params
 * @param {Node} params.start The node to start the traversal from.
 * @param {Node} params.goal The goal node to try to reach.
 * @param {(node: Node) => Node[]} params.neighbours
 * A function which returns the neighbours for a given node.
 * @param {(a: Node, b: Node) => number} params.heuristic
 * A function which measures the "distance" between two nodes.
 * @param {(node: Node) => number} [params.cost]
 * A function which returns the traversal cost of a specific node. Defaults to 1.
 * @returns {Node[] | null}
 */
export function astar({ start, goal, neighbours, heuristic, cost = () => 1 }) {
  /** @type {{ node: Node, priority: number }[]} */
  let queue = [{ node: start, priority: 0 }];

  /** @type {Map<Node, Node>} */
  let paths = new Map();

  /** @type {Map<Node, number>} */
  let costs = new Map([[start, 0]]);

  while (queue.length) {
    let current = required(queue.shift()).node;
    if (current === goal) break;

    for (let next of neighbours(current)) {
      let oldCost = costs.get(next) ?? Infinity;
      let newCost = (costs.get(current) ?? 0) + cost(next);

      if (newCost < oldCost) {
        costs.set(next, newCost);
        paths.set(next, current);
        let priority = newCost + heuristic(next, goal);
        queue.push({ node: next, priority });
        queue.sort((a, b) => a.priority - b.priority);
      }
    }
  }

  let path = [];
  let current = goal;

  while (current !== start) {
    path.push(current);
    let next = paths.get(current);
    if (next) current = next;
    else return null;
  }

  path.push(start);
  path.reverse();

  return path;
}

/**
 * @typedef {(x: number) => number} Easing
 */

/**
 * A collection of easing functions.
 * @satisfies {Record<string, Easing>}
 */
export const easing = {
  linear: (x) => x,
  arc: (x) => Math.sin(x * Math.PI),
  smooth: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  quad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  cubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  quadIn: (x) => x * x,
  cubicIn: (x) => x * x * x,
  quadOut: (x) => 1 - (1 - x) * (1 - x),
  cubicOut: (x) => 1 - Math.pow(1 - x, 3),
  backOut: (x) =>
    1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2),
  bounceOut: (x) => {
    const n = 7.5625,
      d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  },
};

/**
 * Create an image from a URL.
 * @param {string} src
 * @returns {HTMLImageElement}
 */
export function load(src) {
  if (!isBrowser) return unsupported;
  let img = new Image();
  img.src = src;
  onImageReady(img, refresh);
  return img;
}

/**
 * Wait for a texture source to be ready before executing a callback.
 * If the texture source is already loaded, the callback will be synchronous.
 * @param {HTMLImageElement} source
 * @param {(source: HTMLImageElement) => void} callback
 */
async function onImageReady(source, callback) {
  if (source.complete === false || source.naturalWidth === 0) {
    await source.decode();
    callback(source);
  } else {
    callback(source);
  }
}

/**
 * A map of texture sources we've already recolored/tinted.
 * @type {WeakMap<HTMLImageElement, Map<string, OffscreenCanvas>>}
 */
let recolorCache = new WeakMap();

/**
 * Recolor a texture source so that all non-transparent pixels are a specific
 * color. This function is cached, so that it can be called repeatedly.
 *
 * @param {HTMLImageElement} source
 * @param {string} color
 * @returns {CanvasImageSource}
 */
function recolor(source, color) {
  if (!isBrowser) {
    return source;
  }

  let cache = recolorCache.get(source);

  if (!cache) {
    cache = new Map();
    recolorCache.set(source, cache);
  }

  let canvas = cache.get(color);
  if (canvas) return canvas;

  // Give the canvas a temporary non-zero size until the image is ready.
  // This prevents drawImage from throwing when rendering a zero size image.
  canvas = new OffscreenCanvas(1, 1);
  let ctx = required(canvas.getContext("2d"));

  // If the image has already loaded, then we can recolor it immediately.
  // Otherwise, we actually need to draw it _after_ it loads.
  onImageReady(source, () => {
    canvas.width = source.width;
    canvas.height = source.height;
    ctx.drawImage(source, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  cache.set(color, canvas);
  return canvas;
}

/**
 * @param {Partial<Font>} [params]
 * @returns {Font}
 */
export function createFont(params = {}) {
  /**
   * @type {Font}
   */
  let font = {
    ready: false,
    image: params.image ?? load("font.png"),
    bounds: params.bounds ?? { x: 0, y: 0, w: 0, h: 0 },
    glyphs: params.glyphs ?? [],
    lineHeight: params.lineHeight ?? 8,
    letterSpacing: params.letterSpacing ?? 1,
    kerning: buildKerningTable(params.kerning ?? {}),
    charset: params.charset ?? String.fromCharCode(...range(0x20, 0x80)),
    missingCharCode: params.missingCharCode ?? 0x7f,
  };

  onImageReady(font.image, () => {
    buildFontGlyphs(font);
    refresh();
  });

  return font;
}

/**
 * @param {Record<string, number>} kerning
 */
function buildKerningTable(kerning) {
  /** @type {Record<string, number>} */
  let out = {};

  for (let key in kerning) {
    for (let group of key.split(" ")) {
      for (let char of group.slice(1)) {
        out[group[0] + char] = kerning[group] ?? 0;
      }
    }
  }

  return out;
}

/**
 * @param {Font} font
 */
function buildFontGlyphs(font) {
  let image = font.image;
  let { x: sx, y: sy, w: sw, h: sh } = font.bounds;

  // If the user didn't pass a bounds with a with/height, use the full image.
  sw ||= image.width;
  sh ||= image.height;

  let canvas = new OffscreenCanvas(sw, sh);
  let ctx = required(canvas.getContext("2d"));
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let pixels = new Uint32Array(imageData.data.buffer);

  let key = pixels[0];
  let glyph = 0;

  /**
   * @param {number} x
   * @param {number} y
   * @returns {Rectangle}
   */
  function trace(x, y) {
    let x1, y1;
    for (x1 = x; x1 < sw; x1 += 1) {
      if (pixels[x1 + y * sw] === key) break;
    }
    for (y1 = y; y1 < sh; y1 += 1) {
      if (pixels[x + y1 * sw] === key) break;
    }
    return { x: sx + x, y: sy + y, w: x1 - x, h: y1 - y };
  }

  for (let y = 0; y < sh; y += 1) {
    let height = 0;

    for (let x = 0; x < sw; x += 1) {
      if (pixels[x + y * sw] === key) continue;
      let rect = trace(x, y);
      let code = font.charset.charCodeAt(glyph);
      font.glyphs[code] = rect;
      height = Math.max(height, rect.h);
      x += rect.w;
      glyph += 1;
    }

    y += height;
  }

  font.ready = true;
}

/**
 * Calculate the advance width for a specific character within a string
 * of text, accounting for kerning and letter spacing.
 * @param {Font} font
 * @param {string} text
 * @param {number} i
 * @returns {number}
 */
function advance(font, text, i) {
  let code = text.charCodeAt(i);
  let glyph = font.glyphs[code] ?? font.glyphs[font.missingCharCode];
  if (glyph === undefined) return 0;
  let pair = text.slice(i, i + 2);
  let width = glyph.w;
  if (i < text.length - 1) {
    width += font.kerning[pair] ?? 0;
    width += font.letterSpacing;
  }
  return width;
}

/**
 * Measure the width of a single line of text.
 * @param {Font} font
 * @param {string} text
 * @return {number}
 */
export function measure(font, text) {
  let width = 0;

  for (let i = 0; i < text.length; i += 1) {
    width += advance(font, text, i);
  }

  return width;
}

/**
 * Wrap a string onto multiple lines, breaking at explicit newlines or when
 * encountering a word that would overflow the line.
 * @param {Font} font
 * @param {string} text
 * @param {number} maxWidth
 * @return {string[]}
 */
export function wrap(font, text, maxWidth = Infinity) {
  /** @type {string[]} */
  let lines = [];
  let line = "";
  let chunks = text.split(/(\n| +)/g);

  for (let chunk of chunks) {
    if (chunk === "\n") {
      lines.push(line.trimEnd());
      line = "";
      continue;
    }

    let width = measure(font, line + chunk);

    if (line && width > maxWidth) {
      lines.push(line.trimEnd());
      line = chunk.trim() === "" ? "" : chunk;
    } else {
      line += chunk;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

/**
 * @param {Font} font
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} [color]
 */
export function write(font, text, x, y, color) {
  let dx = x;
  let dy = y;

  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);
    let glyph = font.glyphs[code] ?? font.glyphs[font.missingCharCode];

    if (code === 10) {
      dx = x;
      dy += font.lineHeight;
      continue;
    }

    if (glyph) {
      let { x: sx, y: sy, w: sw, h: sh } = glyph;
      let source = color ? recolor(font.image, color) : font.image;
      ctx.drawImage(source, sx, sy, sw, sh, dx | 0, dy | 0, sw, sh);
      dx += advance(font, text, i);
    }
  }
}

/**
 * Resize the canvas to a width and height in pixels.
 * @param {number} w
 * @param {number} h
 */
export function resize(w, h) {
  assert(isBrowser);
  let parentWidth = canvas.parentElement?.clientWidth ?? window.innerWidth;
  let parentHeight = canvas.parentElement?.clientHeight ?? window.innerHeight;
  let scale = Math.min(parentWidth / w, parentHeight / h);
  canvas.width = w;
  canvas.height = h;
  canvas.style.imageRendering = "pixelated";
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;
  ctx.imageSmoothingEnabled = false;
}

/**
 * Clear the canvas.
 * @param {string} [color]
 */
export function clear(color) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/**
 * Render a rectangular slice (probably a sprite) from an image.
 * @param {HTMLImageElement} img
 * @param {Rectangle} rect
 * @param {number} x
 * @param {number} y
 * @param {boolean} [flip]
 * @param {string} [tint]
 */
export function draw(img, rect, x, y, flip, tint) {
  let { x: sx, y: sy, w: sw, h: sh } = rect;
  let source = tint ? recolor(img, tint) : img;

  if (flip) {
    ctx.save();
    ctx.translate(x | 0, y | 0);
    ctx.scale(-1, 1);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, -sw, sh);
    ctx.restore();
  } else {
    ctx.drawImage(source, sx, sy, sw, sh, x | 0, y | 0, sw, sh);
  }
}

/**
 * @param {PointerEvent} event
 */
function handlePointerEvent(event) {
  let bounds = canvas.getBoundingClientRect();
  let scaleX = bounds.width / canvas.width;
  let scaleY = bounds.height / canvas.height;
  let canvasX = (event.clientX - bounds.x) / scaleX;
  let canvasY = (event.clientY - bounds.y) / scaleY;
  let x = Math.floor(canvasX);
  let y = Math.floor(canvasY);
  pointer.dx = x - pointer.x;
  pointer.dy = y - pointer.y;
  pointer.x = x;
  pointer.y = y;

  if (event.type === "pointerdown" && pointer.buttons !== event.buttons) {
    pointer.pressed = event.buttons;
  }

  if (event.type === "pointerup") {
    pointer.released = event.buttons;
  }

  pointer.buttons = event.buttons;
  refresh();
}

/**
 * @param {KeyboardEvent} event
 */
function handleKeyboardEvent(event) {
  if (event.type === "keydown") {
    if (!keyboard.down.has(event.key)) {
      keyboard.pressed.add(event.key);
    }
    keyboard.down.add(event.key);
  } else {
    keyboard.down.delete(event.key);
    keyboard.pressed.delete(event.key);
  }
  refresh();
}

function handleBlurEvent() {
  keyboard.down.clear();
  pointer.buttons = 0;
}

/**
 * @param {object} params
 * @param {number} [params.width] Width of the canvas in pixels.
 * @param {number} [params.height] Height of the canvas in pixels.
 * @param {() => void} [params.update] A function to call once per frame.
 * @param {() => void} params.render A function to call when the game needs to be redrawn.
 * @param {HTMLElement} [params.container] The container
 */
export function start({
  update,
  render,
  width = 320,
  height = 240,
  container = document.body,
}) {
  assert(isBrowser, "must be in a browser to start");
  assert(!running, "game is already started");

  running = true;
  resize(width, height);

  window.addEventListener("pointermove", handlePointerEvent);
  window.addEventListener("pointerdown", handlePointerEvent);
  window.addEventListener("pointerup", handlePointerEvent);
  window.addEventListener("keydown", handleKeyboardEvent);
  window.addEventListener("keyup", handleKeyboardEvent);
  window.addEventListener("blur", handleBlurEvent);

  window.addEventListener("resize", () => {
    resize(canvas.width, canvas.height);
    render();
  });

  let t0 = performance.now();

  function tick(t1 = performance.now()) {
    requestAnimationFrame(tick);

    dt = t1 - t0;
    t0 = t1;
    time += dt;

    update?.();

    if (redraw) {
      render();
      redraw = false;
    }

    pointer.pressed = 0;
    pointer.released = 0;
    keyboard.pressed.clear();
    keyboard.released.clear();
  }

  tick();

  container.append(canvas);
}

let subspr = ctx.drawImage.bind(ctx);

/**
 * Render a nine-patch sprite from a sprite that has a center defined.
 * @param {CanvasImageSource} source
 * @param {Rectangle & { center: Rectangle }} rect
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 */
export function npatch(source, rect, x, y, w, h) {
  let { x: sx, y: sy, w: sw, h: sh, center } = rect;
  let { x: cx, y: cy, w: cw, h: ch } = center;

  // Source slice sizes
  let left = cx;
  let top = cy;
  let right = sw - cx - cw;
  let bottom = sh - cy - ch;

  // Clamp to minimum size to avoid degenerate areas
  w = Math.max(w, left + right);
  h = Math.max(h, top + bottom);

  // Round everything to integer pixels to prevent blurring
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);

  let dx0 = x;
  let dx1 = dx0 + left;
  let dx2 = dx0 + w - right;
  let dy0 = y;
  let dy1 = dy0 + top;
  let dy2 = dy0 + h - bottom;

  // Recompute middle sizes to ensure consistency
  let dcw = dx2 - dx1;
  let dch = dy2 - dy1;

  // Source coordinates
  let sx0 = sx;
  let sx1 = sx0 + left;
  let sx2 = sx0 + sw - right;
  let sy0 = sy;
  let sy1 = sy0 + top;
  let sy2 = sy0 + sh - bottom;

  // Corners
  subspr(source, sx0, sy0, left, top, dx0, dy0, left, top); // top left
  subspr(source, sx2, sy0, right, top, dx2, dy0, right, top); // top right
  subspr(source, sx0, sy2, left, bottom, dx0, dy2, left, bottom); // bottom left
  subspr(source, sx2, sy2, right, bottom, dx2, dy2, right, bottom); // bottom right

  // Edges
  subspr(source, sx1, sy0, cw, top, dx1, dy0, dcw, top); // top
  subspr(source, sx1, sy2, cw, bottom, dx1, dy2, dcw, bottom); // bottom
  subspr(source, sx0, sy1, left, ch, dx0, dy1, left, dch); // left
  subspr(source, sx2, sy1, right, ch, dx2, dy1, right, dch); // right

  // Center
  subspr(source, sx1, sy1, cw, ch, dx1, dy1, dcw, dch);
}

/**
 * Returns a promise that resolves after waiting for some number of milliseconds.
 * @param {number} ms
 * @return {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
