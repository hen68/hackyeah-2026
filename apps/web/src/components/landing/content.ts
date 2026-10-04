/** Static copy and sample data for the landing page. */

export const NAV_LINKS = [
  { href: "#value", label: "What you get" },
  { href: "#how", label: "How it works" },
  { href: "#doctor", label: "For your doctor" },
  { href: "#privacy", label: "Privacy" },
] as const;

/** Prototype and demo video; the matching buttons and section appear only when set on the host. */
export const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL || undefined;
/** Embeddable video URL (YouTube/Vimeo embed) or a direct .mp4/.webm file. */
export const VIDEO_URL = process.env.NEXT_PUBLIC_VIDEO_URL || undefined;

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

export const VALUE_PROPS = [
  {
    icon: "chat",
    title: "A companion with you 24/7",
    body: "Talk to Digna any time of day or night. Its answers are fine-tuned with doctors from menopause clinics, so it asks what a clinician would want to know.",
  },
  {
    icon: "context",
    title: "More context for your doctor's diagnosis",
    body: "Your doctor gets a summary of your conversations with Digna, plus the data from your watch. A fuller picture than a few minutes in the surgery.",
  },
] as const;

export type ValueIcon = (typeof VALUE_PROPS)[number]["icon"];

export const DEVICES = {
  title: "Works with your watch",
  body: "Connect a smartwatch or other wearable and Digna adds sleep, heart rate and activity to your log, with nothing extra to type.",
  items: ["Sleep", "Heart rate", "Activity"],
} as const;

export const STEPS = [
  {
    title: "Check in each day",
    body: "Answer 3 short questions. It takes one minute. Speak or type anything else on your mind.",
  },
  {
    title: "See your patterns",
    body: "I spot patterns and tell you what's worth showing your doctor. Your watch or wearable fills in how you slept and how active you were.",
  },
  {
    title: "Bring a clear report",
    body: "Before each visit, you get a report to give your doctor. No more trying to remember the last month.",
  },
] as const;

export const REPORT_POINTS = [
  "Which symptoms you had, how often and how strong",
  "What changed since the month before",
  "How you slept and your heart rate, from your watch",
  "A summary of your conversations with Digna",
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

/** Production origin for metadata, sitemap and robots; set on the host. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const STATS = [
  {
    value: "3 in 4",
    body: "women have menopause symptoms, and a quarter describe them as severe.",
    source: "British Menopause Society",
    href: "https://thebms.org.uk/wp-content/uploads/2026/03/NEW-BMS-Menopause-Practice-Standards-MAR2026-B.pdf",
  },
  {
    value: "93%",
    body: "of Polish women surveyed could not correctly define menopause.",
    source: "Kulczyk Foundation, “Menopauza bez tabu”",
    href: "https://kulczykfoundation.org.pl/menopauza/badania",
  },
] as const;

export const FAQS = [
  {
    question: "Is Digna medical advice?",
    answer:
      "No. Digna helps you track symptoms and prepare for visits. It doesn't diagnose or replace your doctor. In an emergency, call 112.",
  },
  {
    question: "Who am I talking to?",
    answer:
      "Digna's companion is AI, not a person. It turns what you tell it into entries in your daily log.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "On servers in the EU (Ireland). Only you, and a doctor you choose to link, can see it.",
  },
  {
    question: "When can I use it?",
    answer: "Digna is coming soon to iPhone and Android.",
  },
] as const;

export const BUILT_WITH = "Built at HackYeah 2026 with Expo, Supabase, Claude and Next.js.";
