# Metric: Weekly Active Commuters (WAC)

---

## Overview

**Type:** Lagging | Output | Engagement
**Category:** Engagement/Retention
**Owner:** Product Team

---

## Definition

**What it measures:** The number of unique users who listen to Ridecast content during at least 3 commutes per week (defined as listening sessions between 6-10am or 4-7pm on weekdays).

**Why it matters:** This metric captures product-market fit, habit formation, and real value delivery. It's our North Star because it measures whether we're solving the commute problem consistently, not just occasionally. Users who listen 3+ times per week have formed a habit and are getting real value from Ridecast.

---

## Calculation

### Formula

```
WAC = Count of unique users who completed ≥3 listening sessions
      during commute hours (weekdays 6-10am or 4-7pm)
      in the past 7 days
```

**Example:**

```
User A: Mon 8am (15 min), Tue 5pm (22 min), Thu 8am (18 min) = ✅ Counts (3 sessions)
User B: Wed 8am (30 min), Fri 5pm (25 min) = ❌ Doesn't count (2 sessions)
User C: Sat 2pm (40 min), Sun 3pm (35 min) = ❌ Doesn't count (not commute hours)
```

### Data Sources

- **Source 1:** `playback_events` table - session start/end timestamps
- **Source 2:** `user_sessions` analytics - user_id, session_duration, playback_time
- **Source 3:** Device timezone data - to normalize commute hours across time zones

### Calculation Frequency

**Updated:** Daily (calculated at midnight UTC)
**Lag Time:** Real-time event data, aggregated with <1 hour delay

---

## Targets & Thresholds

### Current Baseline

**Value:** 0 (pre-launch)
**As of:** 2025-10-10

### Targets

| Timeframe | Target  | Rationale                                         |
| --------- | ------- | ------------------------------------------------- |
| 1 Month   | 50      | Beta launch with 100 users, 50% weekly habit      |
| 3 Months  | 500     | Early growth phase, 1000 total users, 50% active  |
| 6 Months  | 2,500   | Product-market fit validation, 5000 users, 50% WAC|
| 1 Year    | 15,000  | Scale phase, 30,000 total users                   |

### Thresholds

| Level       | Threshold           | Action                                    |
| ----------- | ------------------- | ----------------------------------------- |
| 🟢 Healthy  | ≥50% of MAU         | Scale growth efforts, maintain quality    |
| 🟡 Warning  | 30-49% of MAU       | Investigate retention issues, survey users|
| 🔴 Critical | <30% of MAU         | Product-market fit concern, deep dive on UX|

---

## Segmentation

### Key Segments

**By User Type:**

- New users (weeks 1-4): 20-30% WAC rate (building habit)
- Returning users (months 2-6): 50-60% WAC rate (established habit)
- Power users (6+ months): 70-80% WAC rate (core audience)

**By Cohort:**

- Week 1: 30% (early exploration)
- Week 2: 45% (habit forming)
- Week 4: 55% (habit established)

**By Feature:**

- Offline download users: 65% WAC (higher commitment)
- Voice customization users: 60% WAC (personalization = engagement)
- Default users: 40% WAC (baseline)

---

## Relationships

### Input Metrics

[Metrics that influence this metric]

- **Audio Generation Success Rate** → affects WAC by content availability (if generation fails, users can't listen)
- **Time to First Listen** → affects WAC by reducing friction (faster onboarding = higher activation)
- **Offline Download Completion Rate** → affects WAC by enabling reliable playback (downloads prevent streaming failures)

### Output Metrics

[Metrics that this metric influences]

- **WAC** → affects **Monthly Retention** by establishing habit (3+ sessions/week = 80% month-over-month retention)
- **WAC** → affects **Referral Rate** by creating advocates (weekly commuters refer 2x more than occasional users)

### Correlated Metrics

[Metrics that tend to move together]

- **Content Completion Rate** - Users who finish books are 3x more likely to be WAC
- **Session Duration** - WAC users average 25-35 min sessions vs. 12 min for non-WAC users

---

## Analysis Framework

### What Moves This Metric

**Positive Drivers:**

1. Successful first-week onboarding (3+ listens in first 7 days = 70% chance of becoming WAC)
2. High audio quality (4.5+ star ratings correlate with 60% WAC rate)
3. Offline download adoption (downloaded content = 2x WAC rate vs. streaming only)
4. Voice personalization (users who customize voice = 1.5x WAC rate)

**Negative Drivers:**

1. Audio generation failures (each failed conversion = 30% drop in WAC likelihood)
2. Playback errors (streaming interruptions reduce WAC by 40%)
3. Poor first-listen experience (sub-4 star rating = 80% drop in WAC conversion)

### Diagnostic Questions

When metric changes, ask:

1. Did audio generation success rate change? (Quality issue vs. user behavior)
2. Are new cohorts activating at lower rates? (Onboarding problem)
3. Did existing WAC users churn? (Retention issue vs. acquisition issue)
4. Are there seasonal patterns? (Holidays, remote work shifts affecting commutes)

---

## Instrumentation

### Events Tracked

```typescript
// Primary event
track("playback_session_completed", {
  userId: string,
  sessionId: string,
  timestamp: number,
  duration: number, // seconds
  startTime: string, // ISO timestamp
  completionPercent: number, // 0-100
  isCommuteHours: boolean, // 6-10am or 4-7pm weekday
});

// Supporting events
track("playback_started", {
  userId: string,
  contentId: string,
  timestamp: number,
  isOffline: boolean,
});

track("playback_paused", {
  userId: string,
  sessionId: string,
  timestamp: number,
  position: number, // seconds into content
});
```

### Data Quality Checks

- [x] Event firing correctly on playback completion
- [x] All required properties present (userId, timestamp, duration)
- [x] Data types correct (numbers for duration, booleans for isCommuteHours)
- [x] Timestamps accurate (device time vs. server time sync)
- [x] No duplicate events (dedupe by sessionId)
- [x] Commute hours logic verified across timezones

---

## Reporting

### Dashboard Location

**Primary:** [Analytics Dashboard > Engagement > North Star Metrics]
**Secondary:** [Weekly Product Review Deck > Slide 2]

### Report Cadence

| Frequency | Audience          | Format                      |
| --------- | ----------------- | --------------------------- |
| Daily     | Product Team      | Slack #metrics channel      |
| Weekly    | Leadership        | Weekly metrics review meeting|
| Monthly   | All-Hands         | Monthly company presentation |

### Visualization Type

- Line chart - Shows WAC trend over time with 7-day moving average
- Cohort table - Breakdown by user cohort (week 1, 2, 4, etc.)
- Segmentation bar chart - WAC rate by feature usage

---

## Historical Context

### Metric History

| Period     | Value | Change | Notes                  |
| ---------- | ----- | ------ | ---------------------- |
| Pre-launch | 0     | -      | Product not launched   |

### Significant Changes

**Event 1:** [Launch Date] - Initial WAC baseline established
**Event 2:** [TBD] - First major feature release impact

---

## Limitations & Caveats

### What This Metric Doesn't Tell Us

- **Audio Quality**: Users could be listening but hating the experience (need CSAT surveys)
- **Commute vs. Non-Commute**: Some users may use Ridecast for non-commute listening (gym, chores, etc.)
- **Content Type**: Doesn't differentiate between books, articles, or other content formats

### Known Issues

- **Timezone challenges**: Commute hours vary by timezone; using local device time
- **Remote work shifts**: Some users have irregular commute schedules (need flexible definition)
- **Weekend warriors**: Road trippers who listen on weekends don't count (may miss secondary use case)

### Complementary Metrics

To get full picture, also look at:

- **Session Duration** (are users getting through meaningful content?)
- **Content Completion Rate** (are users finishing what they start?)
- **CSAT / NPS** (are users actually satisfied?)

---

## Action Items by Threshold

### If Metric is Above Target (🟢)

1. Analyze what's working—document patterns in successful cohorts
2. Scale marketing efforts to acquire more users while maintaining quality
3. Invest in retention features to keep WAC rate high as we grow

### If Metric Hits Warning (🟡)

1. Run user surveys to understand drop-off reasons
2. Analyze cohort performance—are new users activating at lower rates?
3. Review recent product changes—did anything break the experience?
4. Check audio quality metrics—are generation failures increasing?

### If Metric Goes Critical (🔴)

1. Freeze new feature work—focus on core experience
2. Conduct 10-20 user interviews immediately
3. Analyze funnel drop-off points (upload → generation → first listen → repeat usage)
4. Escalate to leadership—potential product-market fit issue

---

## Experiments & Initiatives

### Active Experiments

- [Experiment 1] - Onboarding flow redesign - Expected impact: +15% WAC conversion
- [Experiment 2] - Voice selection wizard - Expected impact: +10% WAC retention

### Planned Initiatives

- [Initiative 1] - CarPlay integration - Target improvement: +25% WAC (reduce friction)
- [Initiative 2] - Smart playlists for commute length - Target improvement: +12% WAC

### Past Experiments

| Experiment | Date | Result | Impact |
| ---------- | ---- | ------ | ------ |
| [Name]     | TBD  | TBD    | TBD    |

---

## References

**Related Documents:**

- [Vision & North Star](Vision.md)
- [Problem Statement](ProblemStatement.md)
- [Product Principles](Principles.md)
- [Epic 1: Audio Creation](../2-product/epics/epic-1-audio-creation.md)

**External Resources:**

- [Reforge: Engagement Metrics](https://www.reforge.com) - Best practices for engagement metrics
- [Lenny's Newsletter: North Star Metrics](https://www.lennysnewsletter.com) - How to choose North Star metrics

---

## Metadata

**Created:** 2025-10-10
**Last Updated:** 2025-10-10
**Owner:** Chris Park (Product)
**Review Cadence:** Monthly
**Next Review:** 2025-11-10

---

## Change History

| Version | Date       | Author     | Changes                            |
| ------- | ---------- | ---------- | ---------------------------------- |
| v1.0    | 2025-10-10 | Chris Park | Initial metric defined             |
| v2.0    | 2025-10-10 | Chris Park | Updated to match template structure|
