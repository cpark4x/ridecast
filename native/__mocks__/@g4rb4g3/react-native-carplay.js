/**
 * Jest stub for @g4rb4g3/react-native-carplay.
 * The real native module requires Xcode linking; this stub lets Jest
 * load lib/carplay.ts without crashing, while keeping all calls no-ops.
 */
const addListener = jest.fn();
const setRootTemplate = jest.fn();

const CarPlay = {
  emitter: { addListener },
  setRootTemplate,
};

const CPListTemplate = jest.fn().mockImplementation(function (config) {
  this.config = config;
});

const CPListItem = jest.fn().mockImplementation(function (config) {
  this.config = config;
});

module.exports = { CarPlay, CPListTemplate, CPListItem };
