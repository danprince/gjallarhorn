// @ts-check

import { defineConfig } from "vite";
import { ok as assert } from "node:assert";

export default defineConfig({
  base: "./",
  root: "game",
  plugins: [singleFile()],
  define: {
    "import.meta.url": `"."`,
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    target: "esnext",
    minify: "terser",
    sourcemap: false,
    cssMinify: true,
    assetsInlineLimit: 0,
    reportCompressedSize: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
    terserOptions: {
      ecma: 2025,
      compress: {
        passes: 3,
        unsafe: true,
        drop_console: true,
        pure_getters: true,
        pure_new: true,
        toplevel: true,
      },
      mangle: {
        toplevel: true,
        properties: {
          // Required for levels that are stored in { [state: string]: characters } form.
          keep_quoted: true,
        },
      },
    },
  },
});

/**
 * @returns {import("vite").Plugin}
 */
function singleFile() {
  return {
    name: "vite:single-file",
    enforce: "post",
    generateBundle(options, bundle) {
      let html = bundle["index.html"];
      let js = bundle["index.js"];

      assert(html.type === "asset");
      assert(typeof html.source === "string");
      assert(js.type === "chunk");
      assert(typeof js.code === "string");

      html.source = `<script type=module>${js.code}</script>`;

      delete bundle[js.fileName];
    },
  };
}
