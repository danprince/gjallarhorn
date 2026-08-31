import { spritesheet } from "./sprites.js";
import { range, Rect, required } from "./utils.js";

/**
 * @import { Sprite } from "./sprites.js";
 * @import { Rectangle } from "./utils.js";
 */

export let canvas = document.createElement("canvas");
export let ctx = required(canvas.getContext("2d"));

export let sprites = new Image();
sprites.src = "sprites.png";

// The image _must_ be loaded before we can build the palettes below.
await sprites.decode();

let palettes = buildPalettes();

function buildPalettes() {
  let { width: w, height: h } = sprites;
  let { w: sw, h: sh } = spritesheet.swaps;
  let src = getImageData({ x: 0, y: 0, w, h });
  let swaps = getImageData(spritesheet.swaps);

  /**
   * @param {Rectangle} sprite
   */
  function getImageData({ x, y, w, h }) {
    let c = new OffscreenCanvas(sprites.width, sprites.height);
    let ctx = required(c.getContext("2d"));
    ctx.drawImage(sprites, 0, 0);
    return ctx.getImageData(x, y, w, h);
  }

  return range(0, sh).map((row) => {
    let out = new ImageData(w, h);

    for (let i = 0; i < w * h * 4; i += 4) {
      let j = (row * sw + (src.data[i] >> 5)) * 4;
      out.data[i] = swaps.data[j];
      out.data[i + 1] = swaps.data[j + 1];
      out.data[i + 2] = swaps.data[j + 2];
      out.data[i + 3] = src.data[i + 3];
    }

    let c = new OffscreenCanvas(w, h);
    required(c.getContext("2d")).putImageData(out, 0, 0);
    return c;
  });
}

/**
 * Get the palette swapped canvas for a specific palette index.
 * @param {number} index
 */
export function pswap(index) {
  return palettes[index % palettes.length];
}

/**
 * Render a sprite.
 * @param {Sprite} s
 * @param {number} x
 * @param {number} y
 * @param {number} [palette]
 */
export function draw(s, x, y, palette) {
  let { x: sx, y: sy, w: sw, h: sh } = s;
  blit(sx, sy, sw, sh, x, y, sw, sh, palette);
}

/**
 * @param {number} sx
 * @param {number} sy
 * @param {number} sw
 * @param {number} sh
 * @param {number} dx
 * @param {number} dy
 * @param {number} dw
 * @param {number} dh
 * @param {number} [palette]
 */
export function blit(sx, sy, sw, sh, dx, dy, dw, dh, palette = -1) {
  let source = palette >= 0 ? pswap(palette) : sprites;
  ctx.drawImage(source, sx, sy, sw, sh, dx | 0, dy | 0, dw, dh);
}

/**
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} [palette]
 */
export function write(text, x, y, palette = 17) {
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
      draw(g, dx + 1, dy, 18); // shadow (18 is the black palette)
      draw(g, dx - 1, dy, 18); // shadow (18 is the black palette)
      draw(g, dx, dy + 1, 18); // shadow (18 is the black palette)
      draw(g, dx, dy - 1, 18); // shadow (18 is the black palette)
      draw(g, dx, dy, palette);
      dx += ls;
    }
  }
}

/**
 * @param {Sprite} sprite
 * @param {number} palette
 * @returns {string}
 */
export function spriteToDataUrl({ x, y, w, h }, palette = 1) {
  let c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  let ctx = required(c.getContext("2d"));
  ctx.drawImage(palettes[palette], -x, -y);
  return c.toDataURL();
}

/**
 * Render a nine-patch sprite from a sprite that has a center defined.
 * @param {Rectangle & { center: Rectangle }} rect
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} [palette]
 */
export function drawNinePatch(rect, x, y, w, h, palette) {
  let { x: sx, y: sy, w: sw, h: sh, center } = rect;
  let { x: cx, y: cy, w: cw, h: ch } = center;

  // Source slice sizes
  let left = cx;
  let top = cy;
  let right = sw - cx - cw;
  let bottom = sh - cy - ch;

  let dx0 = x;
  let dx1 = dx0 + left;
  let dx2 = dx0 + w - right;
  let dy0 = y;
  let dy1 = dy0 + top;
  let dy2 = dy0 + h - bottom;

  // Recompute middle sizes to ensure consistency
  let dcw = Math.max(0, dx2 - dx1);
  let dch = Math.max(0, dy2 - dy1);

  // Source coordinates
  let sx0 = sx;
  let sx1 = sx0 + left;
  let sx2 = sx0 + sw - right;
  let sy0 = sy;
  let sy1 = sy0 + top;
  let sy2 = sy0 + sh - bottom;

  let p = palette;
  blit(sx0, sy0, left, top, dx0, dy0, left, top, p); // top left
  blit(sx2, sy0, right, top, dx2, dy0, right, top, p); // top right
  blit(sx0, sy2, left, bottom, dx0, dy2, left, bottom, p); // bottom left
  blit(sx2, sy2, right, bottom, dx2, dy2, right, bottom, p); // bottom right
  blit(sx1, sy0, cw, top, dx1, dy0, dcw, top, p); // top
  blit(sx1, sy2, cw, bottom, dx1, dy2, dcw, bottom, p); // bottom
  blit(sx0, sy1, left, ch, dx0, dy1, left, dch, p); // left
  blit(sx2, sy1, right, ch, dx2, dy1, right, dch, p); // right
  blit(sx1, sy1, cw, ch, dx1, dy1, dcw, dch, p);
}
