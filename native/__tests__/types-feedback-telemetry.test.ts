// TDD RED test: verify FeedbackResponse, TelemetryEventPayload, TelemetryResponse
// This test will fail (compile error) until the types are added to types.ts
import type {
  FeedbackResponse,
  TelemetryEventPayload,
  TelemetryResponse,
} from "../lib/types";

describe("Feedback and Telemetry types", () => {
  it("FeedbackResponse has id, summary, and category fields", () => {
    const feedback: FeedbackResponse = {
      id: "test-id",
      summary: "Test summary",
      category: "general",
    };
    expect(feedback.id).toBe("test-id");
    expect(feedback.summary).toBe("Test summary");
    expect(feedback.category).toBe("general");
  });

  it("TelemetryEventPayload has eventType union and metadata record", () => {
    const payload: TelemetryEventPayload = {
      eventType: "api_error",
      metadata: { key: "value" },
    };
    expect(payload.eventType).toBe("api_error");
    expect(payload.metadata).toEqual({ key: "value" });
  });

  it("TelemetryResponse has id field", () => {
    const response: TelemetryResponse = { id: "resp-123" };
    expect(response.id).toBe("resp-123");
  });
});
