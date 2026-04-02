/**
 * Jest manual mock for expo-audio.
 *
 * expo-audio is a native module that calls native code at load time, crashing
 * in a Jest (Node.js) environment. This stub lets any test file that
 * transitively imports expo-audio load without crashing.
 *
 * Tests that exercise audio-recording behaviour directly supply their own
 * inline jest.mock() factory which overrides this file.
 */

const useAudioRecorder = jest.fn(() => ({
  record: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(null),
  uri: null,
  isRecording: false,
  currentTime: 0,
  getStatus: jest.fn().mockResolvedValue({ isRecording: false }),
  prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
  startRecording: jest.fn().mockResolvedValue(undefined),
  stopRecording: jest.fn().mockResolvedValue(null),
}));

const AudioModule = {
  requestRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  getRecordingPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
};

const RecordingPresets = {
  HIGH_QUALITY: {},
  LOW_QUALITY: {},
};

module.exports = {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
};
