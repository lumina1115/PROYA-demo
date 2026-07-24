import type { AnalyticsEvent, AnalyticsState } from "../types";

export const baseAnalytics: AnalyticsState = {
  quizStarted: 1248,
  quizCompleted: 982,
  resultViewed: 941,
  planSaved: 526,
  conversionClicked: 318,
  positive: 174,
  negative: 21,
};

const eventMap: Record<AnalyticsEvent, keyof AnalyticsState> = {
  quiz_started: "quizStarted",
  quiz_completed: "quizCompleted",
  result_viewed: "resultViewed",
  plan_saved: "planSaved",
  conversion_clicked: "conversionClicked",
  feedback_positive: "positive",
  feedback_negative: "negative",
};

export function loadAnalytics(): AnalyticsState {
  try {
    const stored = localStorage.getItem("proya-skinlab-analytics");
    return stored ? { ...baseAnalytics, ...JSON.parse(stored) } : baseAnalytics;
  } catch {
    return baseAnalytics;
  }
}

export function track(current: AnalyticsState, event: AnalyticsEvent) {
  const key = eventMap[event];
  const next = { ...current, [key]: current[key] + 1 };
  localStorage.setItem("proya-skinlab-analytics", JSON.stringify(next));
  return next;
}
