// CJS stub — prevents Jest 30's ESM scope check from failing when
// expo/src/winter/runtime.native.ts lazily requires this module during setup.
module.exports = {
  ImportMetaRegistry: {
    get url() {
      return "file:///mock";
    },
  },
};
