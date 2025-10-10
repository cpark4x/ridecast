# Metric: [Metric Name]

---

## Overview

**Type:** [Leading/Lagging | Input/Output | Health/Growth]
**Category:** [Engagement/Retention/Growth/Quality/Business]
**Owner:** [Team/Person responsible]

---

## Definition

**What it measures:** [Clear, concise definition of what this metric tracks]

**Why it matters:** [Explanation of why this metric is important to the business/product]

---

## Calculation

### Formula

```
Metric = [Mathematical formula]
```

**Example:**

```
Daily Active Users (DAU) = Count of unique users who performed
                          any action in the last 24 hours
```

### Data Sources

- **Source 1:** [Database/Table/API]
- **Source 2:** [Analytics tool/Event]
- **Source 3:** [External system]

### Calculation Frequency

**Updated:** [Real-time / Hourly / Daily / Weekly / Monthly]
**Lag Time:** [How fresh the data is]

---

## Targets & Thresholds

### Current Baseline

**Value:** [Current metric value]
**As of:** [Date]

### Targets

| Timeframe | Target | Rationale         |
| --------- | ------ | ----------------- |
| 1 Month   | [X]    | [Why this target] |
| 3 Months  | [Y]    | [Why this target] |
| 6 Months  | [Z]    | [Why this target] |
| 1 Year    | [W]    | [Why this target] |

### Thresholds

| Level       | Threshold | Action       |
| ----------- | --------- | ------------ |
| 🟢 Healthy  | > [X]     | [What to do] |
| 🟡 Warning  | [Y] - [X] | [What to do] |
| 🔴 Critical | < [Y]     | [What to do] |

---

## Segmentation

### Key Segments

**By User Type:**

- New users: [Expected range]
- Returning users: [Expected range]
- Power users: [Expected range]

**By Cohort:**

- Week 1: [Expected value]
- Week 2: [Expected value]
- Week 4: [Expected value]

**By Feature:**

- Feature A users: [Expected value]
- Feature B users: [Expected value]

---

## Relationships

### Input Metrics

[Metrics that influence this metric]

- [Input Metric 1] → affects [Metric Name] by [relationship]
- [Input Metric 2] → affects [Metric Name] by [relationship]

### Output Metrics

[Metrics that this metric influences]

- [Metric Name] → affects [Output Metric 1] by [relationship]
- [Metric Name] → affects [Output Metric 2] by [relationship]

### Correlated Metrics

[Metrics that tend to move together]

- [Metric 1] - [Description of correlation]
- [Metric 2] - [Description of correlation]

---

## Analysis Framework

### What Moves This Metric

**Positive Drivers:**

1. [Action/change that increases metric]
2. [Action/change that increases metric]

**Negative Drivers:**

1. [Action/change that decreases metric]
2. [Action/change that decreases metric]

### Diagnostic Questions

When metric changes, ask:

1. [Question to understand the change]
2. [Question to understand the change]
3. [Question to understand the change]

---

## Instrumentation

### Events Tracked

```typescript
// Primary event
track("event_name", {
  userId: string,
  timestamp: number,
  property1: string,
  property2: number,
});

// Supporting events
track("supporting_event", {
  // properties
});
```

### Data Quality Checks

- [ ] Event firing correctly
- [ ] All required properties present
- [ ] Data types correct
- [ ] Timestamps accurate
- [ ] No duplicate events
- [ ] Filter logic verified

---

## Reporting

### Dashboard Location

**Primary:** [Link to dashboard]
**Secondary:** [Link to alternate view]

### Report Cadence

| Frequency | Audience     | Format                  |
| --------- | ------------ | ----------------------- |
| Daily     | [Team]       | [Slack/Email/Dashboard] |
| Weekly    | [Team]       | [Meeting/Report]        |
| Monthly   | [Leadership] | [Presentation]          |

### Visualization Type

- [Chart type] - [Why this visualization]
- [Breakdown format]
- [Trend display]

---

## Historical Context

### Metric History

| Period | Value | Change | Notes     |
| ------ | ----- | ------ | --------- |
| [Date] | [X]   | -      | [Context] |
| [Date] | [Y]   | +Z%    | [Context] |
| [Date] | [W]   | -A%    | [Context] |

### Significant Changes

**Event 1:** [Date] - [What happened and impact on metric]
**Event 2:** [Date] - [What happened and impact on metric]

---

## Limitations & Caveats

### What This Metric Doesn't Tell Us

- [Limitation 1]
- [Limitation 2]
- [Limitation 3]

### Known Issues

- [Data quality issue]
- [Measurement challenge]
- [Interpretation caveat]

### Complementary Metrics

To get full picture, also look at:

- [Metric 1]
- [Metric 2]

---

## Action Items by Threshold

### If Metric is Above Target (🟢)

1. [Action to maintain or scale]
2. [Action to maintain or scale]

### If Metric Hits Warning (🟡)

1. [Diagnostic action]
2. [Remediation action]
3. [Communication action]

### If Metric Goes Critical (🔴)

1. [Immediate action]
2. [Investigation action]
3. [Escalation procedure]

---

## Experiments & Initiatives

### Active Experiments

- [Experiment 1] - Expected impact: [+/-X%]
- [Experiment 2] - Expected impact: [+/-Y%]

### Planned Initiatives

- [Initiative 1] - Target improvement: [Z%]
- [Initiative 2] - Target improvement: [W%]

### Past Experiments

| Experiment | Date   | Result             | Impact  |
| ---------- | ------ | ------------------ | ------- |
| [Name]     | [Date] | [Win/Loss/Neutral] | [+/-X%] |

---

## References

**Related Documents:**

- [Product Requirements](../product/features/)
- [Analytics Implementation](../metrics/instrumentation.md)
- [Dashboard Documentation](../metrics/dashboards.md)

**External Resources:**

- [Article/Tool] - [Link]
- [Benchmark/Industry Standard] - [Link]

---

## Metadata

**Created:** [Date]
**Last Updated:** [Date]
**Owner:** [Name/Team]
**Review Cadence:** [How often to review this definition]
**Next Review:** [Date]

---

## Change History

| Version | Date   | Author   | Changes                 |
| ------- | ------ | -------- | ----------------------- |
| v1.0    | [Date] | [Author] | Initial metric defined. |
