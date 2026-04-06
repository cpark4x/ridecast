// native/__tests__/emptyStateComponents.test.ts

import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import type { EmptyStateCTAButtonProps } from "../components/empty-states/EmptyStateCTAButton";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NewUserModule = require("../components/empty-states/NewUserEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AllCaughtUpModule = require("../components/empty-states/AllCaughtUpEmptyState");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: EmptyStateCTAButton } = require("../components/empty-states/EmptyStateCTAButton");

const noop = () => {};

function renderCTAButton(props: Partial<EmptyStateCTAButtonProps> = {}) {
  return render(
    React.createElement(EmptyStateCTAButton, {
      label: "Get Started",
      onPress: noop,
      ...props,
    })
  );
}

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
    const { getByText } = renderCTAButton();
    getByText("Get Started");
  });

  it("calls onPress when the button is pressed", () => {
    const onPress = jest.fn();
    const { getByRole } = renderCTAButton({ onPress });
    fireEvent.press(getByRole("button"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("uses label as accessibilityLabel when accessibilityLabel is not provided", () => {
    const label = "Create Your First Episode";
    const { getByLabelText } = renderCTAButton({ label });
    getByLabelText(label);
  });

  it("uses the explicit accessibilityLabel when provided, not the label", () => {
    const label = "Go";
    const accessibilityLabel = "Navigate to the next screen";
    const { getByLabelText, queryByLabelText } = renderCTAButton({
      label,
      accessibilityLabel,
    });
    getByLabelText(accessibilityLabel);
    expect(queryByLabelText(label)).toBeNull();
  });
});

