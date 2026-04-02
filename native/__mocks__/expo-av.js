/**
 * Jest manual mock for expo-av.
 *
 * expo-av is not installed in the native Jest environment (it's a native
 * module that requires linking). This stub allows test files that transitively
 * import expo-av to load without crashing.
 *
 * Tests that exercise Audio/Recording behaviour directly supply their own
 * inline jest.mock() factory which overrides this file.
 */

const MockRecording = jest.fn().mockImplementation(function () {
  this.prepareToRecordAsync = jest.fn().mockResolvedValue(undefined);
  this.startAsync = jest.fn().mockResolvedValue(undefined);
  this.stopAndUnloadAsync = jest.fn().mockResolvedValue(undefined);
  this.getURI = jest.fn().mockReturnValue(null);
  this.getStatusAsync = jest.fn().mockResolvedValue({ isDoneRecording: false });
});

module.exports = {
  Audio: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Recording: MockRecording,
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
      LOW_QUALITY: {},
    },
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: {}, status: {} }),
    },
  },
  Video: jest.fn(),
};
