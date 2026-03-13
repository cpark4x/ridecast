// CJS stub — replaces expo/src/winter (the WinterCG runtime index) in Jest.
//
// WHY THIS EXISTS (Jest 30 + bare `node` without --experimental-vm-modules):
//
// expo/src/winter/index.ts does  `import './runtime'`  — a RELATIVE import.
// Jest's moduleNameMapper patterns are matched against the *raw module-name
// string*, so the pattern  expo/src/winter/runtime(\.native)?$  never matches
// `./runtime`.  That means runtime.native.ts loads for real and calls e.g.:
//
//   install('structuredClone',
//     () => require('@ungap/structured-clone').default)
//   install('__ExpoImportMetaRegistry',
//     () => require('./ImportMetaRegistry').ImportMetaRegistry)
//   …
//
// Each `install()` call uses defineLazyObjectProperty() to attach a lazy
// getter to `global`.  The getter fires the first time anything reads the
// property.  At that point jest-runtime calls _execModule, which in Jest 30
// throws:
//
//   ReferenceError: You are trying to `import` a file outside of the scope
//   of the test code.
//
// when isInsideTestCode === false (set by leaveTestCode() after any hook or
// test function completes) and vm.SourceTextModule is absent (i.e. no
// --experimental-vm-modules flag).
//
// STRATEGY — two-pronged:
//
//   1. Map `^expo/src/winter$` to this file so the index is intercepted before
//      it can load runtime.native.ts via the relative `./runtime` import.
//
//   2. Lock all globals that runtime.native.ts would polyfill as
//      configurable:false.  installGlobal() checks configurable; if false it
//      logs a console.error and returns without installing a lazy getter.
//      This protects against any OTHER path that might still load
//      runtime.native.ts (e.g. when jest.requireActual('expo-modules-core')
//      triggers a transitive chain that we can't easily map).
//
// All globals targeted here (TextDecoder, URL, structuredClone, …) already
// exist in Node 18+ with correct implementations.  Locking them non-configurable
// is safe for this project's tests and prevents the lazy-getter trap entirely.
'use strict';

/**
 * Re-define a global as non-configurable so installGlobal() cannot replace
 * it with a lazy getter.  If the property does not yet exist, create it with
 * the supplied fallback value.
 */
function lockGlobal(name, fallbackValue) {
  if (!Object.prototype.hasOwnProperty.call(global, name)) {
    Object.defineProperty(global, name, {
      value: fallbackValue,
      configurable: false,
      writable: true,
      enumerable: true,
    });
    return;
  }

  const desc = Object.getOwnPropertyDescriptor(global, name);
  if (!desc || !desc.configurable) return; // already locked or accessor — skip

  // Re-define with the same value but configurable:false.
  // Keep writable:true so direct assignment still works (for jest.fn() shims).
  if ('value' in desc) {
    Object.defineProperty(global, name, {
      value: desc.value,
      configurable: false,
      writable: true,
      enumerable: desc.enumerable !== false,
    });
  }
  // Accessor properties (get/set) that are configurable — leave them alone;
  // they aren't the ones runtime.native.ts replaces.
}

// ── Expo-specific global ────────────────────────────────────────────────────
// Not present in Node.js — provide a minimal mock and lock it.
lockGlobal('__ExpoImportMetaRegistry', {
  get url() {
    return 'file:///mock';
  },
});

// ── Node 18+ built-ins — lock them so installGlobal() skips them ────────────
lockGlobal('structuredClone', global.structuredClone);
lockGlobal('TextDecoder',     global.TextDecoder);
lockGlobal('TextDecoderStream', global.TextDecoderStream);
lockGlobal('TextEncoderStream', global.TextEncoderStream);
lockGlobal('URL',             global.URL);
lockGlobal('URLSearchParams', global.URLSearchParams);

module.exports = {};
