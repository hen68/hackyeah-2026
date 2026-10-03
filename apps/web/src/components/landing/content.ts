/** Static copy and sample data for the landing page. */

export const NAV_LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#doctor", label: "For your doctor" },
  { href: "#privacy", label: "Privacy" },
] as const;

export const STORES = ["App Store", "Google Play"] as const;
export type Store = (typeof STORES)[number];

/** Dark numbers on dots 1–4 keep 4.5:1 contrast (matches mobile severityTextColors). */
export const SEVERITY_SCALE = [
  { value: 1, label: "None", dot: "bg-severity-1", ink: "text-ink" },
  { value: 2, label: "Mild", dot: "bg-severity-2", ink: "text-ink" },
  { value: 3, label: "Moderate", dot: "bg-severity-3", ink: "text-ink" },
  { value: 4, label: "Strong", dot: "bg-severity-4", ink: "text-ink" },
  { value: 5, label: "Severe", dot: "bg-severity-5", ink: "text-white" },
] as const;

export const PREVIEW_SELECTED_SEVERITY = 4;

export const STEPS = [
  {
    title: "Check in each day",
    body: "Answer 3 short questions. It takes one minute. Speak or type anything else on your mind.",
  },
  {
    title: "See your patterns",
    body: "I spot patterns and tell you what's worth showing your doctor. Your watch can fill in how you slept.",
  },
  {
    title: "Bring a clear report",
    body: "Before each visit, you get a report to give your doctor. No more trying to remember the last month.",
  },
] as const;

export const REPORT_POINTS = [
  "Which symptoms you had, how often and how strong",
  "What changed since the month before",
  "How you slept, from your watch",
  "Your own words and the questions you want to ask",
] as const;

export const REPORT_DAYS = 30;

export const SAMPLE_FLAGS = [
  { symptom: "Night sweats", detail: "on 22 of 30 nights, waking on 15." },
  { symptom: "Low mood", detail: "on 9 of 30 days, up from 2." },
] as const;

export const SAMPLE_SYMPTOMS = [
  { name: "Hot flushes", days: 26 },
  { name: "Night sweats", days: 22 },
  { name: "Poor sleep", days: 18 },
  { name: "Low mood", days: 9 },
] as const;

export const PRIVACY_PROMISES = [
  {
    icon: "eye",
    title: "You choose who sees it",
    body: "Your report goes to your doctor only when you share it.",
  },
  {
    icon: "trash",
    title: "Download or delete any time",
    body: "Get a copy of everything you logged, or delete it, from your profile.",
  },
  {
    icon: "lock",
    title: "Never sold, never ads",
    body: "Your health data is not sold or used for advertising.",
  },
] as const;

export type PrivacyIcon = (typeof PRIVACY_PROMISES)[number]["icon"];
