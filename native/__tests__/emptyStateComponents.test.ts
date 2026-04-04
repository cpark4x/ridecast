// native/__tests__/emptyStateComponents.test.ts

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewUserModule = require("../components/empty-states/NewUserEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AllCaughtUpModule = require("../components/empty-states/AllCaughtUpEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: EmptyStateCTAButton } = require("../components/empty-states/EmptyStateCTAButton");

describe("NewUserEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof NewUserModule.default).toBe("function");
  });
});

describe("AllCaughtUpEmptyState", () => {
  it("has a default export that is a function", () => {
    expect(typeof AllCaughtUpModule.default).toBe("function");
  });
});

describe("EmptyStateCTAButton", () => {
  it("renders the label text", () => {
    const { getByText } = render(
      React.createElement(EmptyStateCTAButton, {
        label: "Get Started",
        onPress: () => {},
      })
    );
    expect(getByText("Get Started")).toBeTruthy();
  });

  it("calls onPress when the button is pressed", () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      React.createElement(EmptyStateCTAButton, {
        label: "Get Started",
        onPress,
      })
    );
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses label as accessibilityLabel when accessibilityLabel is not provided", () => {
    const { getByA11yLabel } = render(
      React.createElement(EmptyStateCTAButton, {
        label: "Create Your First Episode",
        onPress: () => {},
      })
    );
    expect(getByA11yLabel("Create Your First Episode")).toBeTruthy();
  });

  it("uses the explicit accessibilityLabel when provided, not the label", () => {
    const { getByA11yLabel, queryByA11yLabel } = render(
      React.createElement(EmptyStateCTAButton, {
        label: "Go",
        onPress: () => {},
        accessibilityLabel: "Navigate to the next screen",
      })
    );
    expect(getByA11yLabel("Navigate to the next screen")).toBeTruthy();
    expect(queryByA11yLabel("Go")).toBeNull();
  });
});

