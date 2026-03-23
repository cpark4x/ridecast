// Jest setupFilesAfterEnv — runs once per test file, after the framework is
// installed but before any test code.
//
// WHY THIS EXISTS:
// expo/src/winter/installGlobal.ts calls console.error when it tries to
// install a polyfill onto a global that is already non-configurable:
//
//   console.error('Failed to set polyfill. ' + name + ' is not configurable.')
//
// We lock those globals non-configurable in __mocks__/expo-winter-runtime.js
// so that the lazy-getter trap in runtime.native.ts can never be installed.
// The side-effect is that when expo-router / expo-sqlite import expo which
// transitively loads expo/src/winter/index.ts → ./runtime, installGlobal
// emits those messages for every polyfill it can't install.
//
// The messages are harmless — the Node 18+ built-in remains in place — but
// they clutter test output.  We silence only that specific prefix here and
// let all other console.error calls through unchanged.
'use strict';

const _origError = console.error.bind(console);

console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].startsWith('Failed to set polyfill.')
  ) {
    return; // swallow — intentional side-effect of non-configurable globals
  }
  _origError(...args);
};
