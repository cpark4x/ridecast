/**
 * Jest manual mock for @gorhom/bottom-sheet.
 * The real package loads react-native-reanimated which requires react-native-worklets
 * native initialization — crashing in Jest. This stub provides no-op implementations.
 *
 * Tests that exercise BottomSheet behaviour directly provide their own inline
 * jest.mock() factory which overrides this file.
 */
const React = jest.requireActual('react');

const BottomSheet = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetModal = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetModalProvider = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetView = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetFlatList = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetScrollView = jest.fn().mockImplementation(({ children }) =>
  React.createElement(React.Fragment, null, children)
);

const BottomSheetBackdrop = jest.fn(() => null);

const useBottomSheet = jest.fn(() => ({
  expand: jest.fn(),
  collapse: jest.fn(),
  close: jest.fn(),
  snapToIndex: jest.fn(),
  snapToPosition: jest.fn(),
  forceClose: jest.fn(),
}));

const useBottomSheetModal = jest.fn(() => ({
  present: jest.fn(),
  dismiss: jest.fn(),
}));

module.exports = {
  default: BottomSheet,
  BottomSheet,
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetView,
  BottomSheetFlatList,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  useBottomSheet,
  useBottomSheetModal,
};
