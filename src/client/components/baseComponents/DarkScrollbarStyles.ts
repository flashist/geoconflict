import { css } from "lit";

// Flashist Adaptation: task 0423 — the game's dark thin scrollbar, for
// components that render into a shadow root. The page's copy lives in
// src/client/styles.css, but page styles do not reach inside a shadow root, so
// a shadow component that scrolls would otherwise draw the browser's light
// default scrollbar. Add this first in the component's `static styles` array.
//
// Keep both copies in sync — tests/client/components/DarkScrollbar.test.ts
// fails if they drift, and fails if a shadow component that declares a scroll
// area does not use this.
//
// No `scrollbar-color` or `scrollbar-width` here, or in any component that uses
// this: since Chromium 121, either one set to a non-`auto` value turns the
// `::-webkit-scrollbar` rules off. `scrollbar-color` is also inherited, so a
// page-level one would turn them off inside every shadow root too
// (`scrollbar-width` is not inherited).
//
// Chromium-based browsers only (Chrome, Yandex browser). Firefox keeps its
// default scrollbar, as on the rest of the app.
export const darkScrollbarStyles = css`
  *::-webkit-scrollbar {
    width: 8px;
  }

  *::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  *::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  *::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;
