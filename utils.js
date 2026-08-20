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
 */

/**
 * Creates a rectangle.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {Rectangle}
 */
export function Rect(x, y, w, h) {
  return { x, y, w, h };
}

/**
 * Creates a vector.
 * @param {number} x
 * @param {number} y
 * @returns {Vector}
 */
export function Vec(x, y) {
  return { x, y };
}

export const north = Vec(0, -1);
export const south = Vec(0, 1);
export const east = Vec(1, 0);
export const west = Vec(-1, 0);
export const northeast = Vec(1, -1);
export const southeast = Vec(1, 1);
export const southwest = Vec(-1, 1);
export const northwest = Vec(-1, -1);
export const cardinals = [north, south, east, west];
export const diagonals = [northeast, southeast, southwest, northwest];

/**
 * Add `a` to `b` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function add(a, b) {
  return Vec(a.x + b.x, a.y + b.y);
}

/**
 * Subtract `b` from `a` and return the resulting vector.
 * @param {Vector} a
 * @param {Vector} b
 * @returns {Vector}
 */
export function sub(a, b) {
  return Vec(a.x - b.x, a.y - b.y);
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
export function required(value) {
  if (value == null) throw required;
  return value;
}

/**
 * @template Value
 * @param {Value} value
 * @returns {value is NonNullable<Value>}
 */
export function exists(value) {
  return value != null;
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
 * @param {number} t
 * @returns {number}
 */
export function smoothstep(t) {
  return t * t * (3 - 2 * t);
}

/**
 * Generate the sequence of integers between two numbers.
 * @param {number} min (inclusive)
 * @param {number} max (exclusive)
 */
export function range(min, max) {
  return Array.from({ length: max - min }).map((_, i) => min + i);
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
