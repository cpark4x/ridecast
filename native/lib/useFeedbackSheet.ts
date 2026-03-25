import { createContext, useContext } from "react";

export interface FeedbackSheetContextType {
  openFeedbackSheet(): void;
}

export const FeedbackSheetContext =
  createContext<FeedbackSheetContextType | null>(null);

export function useFeedbackSheet(): FeedbackSheetContextType {
  const ctx = useContext(FeedbackSheetContext);
  if (ctx === null) {
    throw new Error(
      "useFeedbackSheet must be used within FeedbackSheetContext.Provider",
    );
  }
  return ctx;
}
