<img width="825" height="340" alt="banner" src="https://github.com/user-attachments/assets/a25fe471-fb7b-4d84-9fc6-025d9bc2841e" />

# Gjallarhorn

A puzzle game built for [JS13K 2026](https://js13kgames.com/2026/).

Command a rabble of Norse gods through a series of giant puzzles in order to retrieve the [Gjallarhorn](https://en.wikipedia.org/wiki/Gjallarhorn) and bring balance back to the [Bifröst](https://en.wikipedia.org/wiki/Bifr%C3%B6st).

You can play the game in a browser at [gjallarhorn.danprince.me](https://gjallarhorn.danprince.me).

## Editor

The game includes a [built-in level editor](https://gjallarhorn.danprince.me?edit); add `?edit` to the URL (before the `#` fragment) then you can use the keyboard to add cards to the board:

- <kbd>esc</kbd> or <kbd>x</kbd> to erase the card under the cursor.
- <kbd>1-9</kbd> to set the card under the cursor.
- <kbd>shift</kbd>+<kbd>1-9</kbd> to set the health of a card.

Whilst editing, the state of the level is saved in the URL so that you can share your puzzles. It's not currently possible to control either dialogue or character unlocks through the level editor.

## Running

The game runs in any browser without installing any dependencies or running a build step, so you can also just point your HTTP server of choice towards `index.html`.

```sh
python -m http.server game
```

Alternative for live reloads, you can start the game with Vite after installing dependencies with pnpm.

```sh
pnpm dev
```

## Building

The game uses a mixture of JS tooling for bundling and native tooling for compressing PNG and ZIP files. You'll need the following tools installed:

- [`pnpm`](https://pnpm.io/)
- [`make`](https://linux.die.net/man/1/make)
- [`advzip`](https://www.advancemame.it/doc-advzip)
- [`oxipng`](https://github.com/oxipng/oxipng)

After they are installed:

- Run `pnpm install` to install the JS dependencies.
- Run `make` to compile, compress the game into `dist.zip`.
