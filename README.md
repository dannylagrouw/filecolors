# filecolors

A small Bun-powered web app for inspecting and editing the hex colors in a
text file, without a design tool. Drop in a file, see every `#hex` color it
contains as a palette, tweak them visually, and get the edited file back
out.

## Features

- Detects `#rgb` and `#rrggbb` hex color codes in any text file.
- Color palette bar: reorder, preview shades/tints, copy hex to
  clipboard, edit via a color picker, revert to the original color, and
  mark favorites.
- Inline colored swatches next to every hex code in the file view.
- Editing a palette color rewrites all of its occurrences in the file text
  live, in the browser.
- Download the edited file, or (in local-dev mode) save it straight back
  to disk.

## Requirements

[Bun](https://bun.sh) v1.x.

## Getting started (hosted / upload mode)

```sh
bun install
bun run dev      # starts the server with hot reload at http://localhost:3000
```

Open the app in a browser, upload a file (drag-and-drop or the file
picker), edit colors, and download the result.

To run without hot reload:

```sh
bun run start
```

### Choosing a port

Defaults to port `3000`. Override it with the `PORT` env var or a
`--port`/`-p` flag:

```sh
PORT=8080 bun run dev
bun run src/server/index.ts --port 8080
```

## Local-dev mode

For editing a file already on disk without a manual upload step:

```sh
./filecolors.sh path/to/file.css
```

This starts a local server preloaded with that file. The app opens with
the file already loaded and scanned. Alongside "Download," you get an
explicit "Save to disk" action that writes your edits back to the
original file path — nothing is written to disk unless you trigger it.

Pass `--port`/`-p` to use a different port:

```sh
./filecolors.sh path/to/file.css --port 8080
```

### Favorites in local-dev mode

Since a CLI-launched server has no persistent browser to rely on,
favorites are stored on disk instead of in `localStorage`, at:

```
$XDG_STATE_HOME/filecolors/favorites.json
```

falling back to `~/.local/state/filecolors/favorites.json` when
`XDG_STATE_HOME` is unset.

## Project structure

```
src/server/   Bun.serve entry point, static asset serving, local-file
              and favorites API routes
src/client/   Browser-side app: color scanning, palette state, rendering,
              clipboard/download helpers (plain TS, no framework)
public/       index.html shell
filecolors.sh Local-dev launcher script
```

## Testing

```sh
bun test
```

## Limitations

- Only hex colors (`#abc`, `#aabbcc`) are recognized — no `rgb()`, `hsl()`,
  named colors, or 8-digit alpha hex in v1.
- Text files only; a configured max upload size (5 MB) is enforced.

