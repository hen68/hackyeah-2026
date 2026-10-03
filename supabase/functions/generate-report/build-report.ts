// Turns raw diary rows into the structured data of the pre-visit report. Pure, no I/O.
// Everything numeric is computed here so the report never depends on the model's arithmetic.
// Severity is 1 none .. 5 severe, so a higher number is always worse.

export const REPORT_VERSION = 1;
export const PERIOD_DAYS = 30;
export const PRESENT_MIN_SEVERITY = 2;
export const TREND_THRESHOLD = 1.0;
export const MIN_DAYS_PER_HALF = 3;
export const MIN_DAYS_PRIOR = 3;
export const MAX_NOTES = 10;
export const MAX_HIGHLIGHTS = 8;
const TEXT_CHARS = 300;
const DAY_MS = 24 * 60 * 60 * 1000;

export type Source = "checkin" | "chat";
export type Trend = "worse" | "better" | "stable" | "insufficient_data";
export type DayStatus = "good" | "okay" | "hard" | "none";

export type CheckinDay = {
  day: string;
  note: string | null;
  entries: { symptom_code: string | null; custom_label: string | null; severity: number }[];
};
export type ObservationRow = {
  observed_on: string;
  symptom_code: string | null;
  custom_label: string | null;
  severity: number | null;
  excerpt: string | null;
};
export type NightRow = {
  night_of: string;
  provider: string;
  sleep_minutes: number | null;
  awakenings: number | null;
  resting_hr: number | null;
  skin_temp_delta_c: number | null;
  warm_at: string | null;
};

export type ReportInputs = {
  periodEnd: string; // the patient's local date, inclusive
  appointment: { id: string; scheduled_at: string; clinician_id: string | null; doctor_name: string | null };
  profile: {
    display_name: string | null;
    age_band: string | null;
    menopause_stage: string | null;
    last_period: string | null;
    hrt_status: string | null;
    timezone: string;
    locale: string;
  };
  planCodes: string[];
  catalog: { code: string; label: string }[];
  checkins: CheckinDay[]; // the period and the 30 days before it
  observations: ObservationRow[];
  nights: NightRow[];
  providers: string[];
};

export type SymptomStat = {
  code: string | null;
  label: string;
  days_logged: number;
  days_present: number; // days with severity >= 2
  mean_severity: number;
  max_severity: number;
  last_logged: string;
  first_half_mean: number | null;
  second_half_mean: number | null;
  trend: Trend;
  prior_period_mean: number | null;
  change_vs_prior: number | null;
  sources: Source[];
};

export type ReportStats = {
  version: number;
  generated_at: string;
  appointment: ReportInputs["appointment"];
  period: { start: string; end: string; days: number };
  patient: ReportInputs["profile"];
  data_quality: { checkin_days: number; days_in_period: number; coverage: number; chat_observations: number; wearable_nights: number };
  monitoring_plan: { code: string; label: string }[];
  symptoms: SymptomStat[];
  bleeding: { days: number; dates: string[] };
  daily: { day: string; status: DayStatus; max_severity: number | null; symptoms: { code: string | null; label: string; severity: number }[] }[];
  notes: { day: string; text: string }[];
  chat_highlights: { date: string; symptom: string; severity: number | null; excerpt: string | null }[];
  wearables: {
    providers: string[];
    nights: number;
    avg_sleep_minutes: number | null;
    avg_awakenings: number | null;
    avg_resting_hr: number | null;
    avg_skin_temp_delta_c: number | null;
    series: Omit<NightRow, "provider">[];
  };
  disclaimer: string;
};

export const DISCLAIMER = "Patient-reported data and device readings. This is not a diagnosis.";

const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const round1 = (x: number) => Math.round(x * 10) / 10;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const clip = (text: string | null) => (text ? text.trim().replace(/\s+/g, " ").slice(0, TEXT_CHARS) : null);
const avg = (values: (number | null)[], digits = 1) => {
  const real = values.filter((v): v is number => v !== null);
  if (real.length === 0) return null;
  const m = mean(real);
  return digits === 0 ? Math.round(m) : round1(m);
};

export function symptomKey(code: string | null, label: string | null): string {
  return code ?? `custom:${(label ?? "").trim().toLowerCase()}`;
}

export function dayStatus(maxSeverity: number | null): DayStatus {
  if (maxSeverity === null) return "none";
  if (maxSeverity <= 2) return "good";
  if (maxSeverity === 3) return "okay";
  return "hard";
}

type Slot = { code: string | null; label: string; days: Map<string, number>; prior: Map<string, number>; sources: Set<Source> };

export function buildStats(input: ReportInputs, generatedAt: string): ReportStats {
  const end = input.periodEnd;
  const start = addDays(end, -(PERIOD_DAYS - 1));
  const priorStart = addDays(start, -PERIOD_DAYS);
  const midpoint = addDays(start, PERIOD_DAYS / 2); // days before it are the first half
  const inPeriod = (day: string) => day >= start && day <= end;
  const inPrior = (day: string) => day >= priorStart && day < start;
  const labels = new Map(input.catalog.map((s) => [s.code, s.label]));

  const slots = new Map<string, Slot>();
  const record = (code: string | null, custom: string | null, day: string, severity: number, source: Source) => {
    const target = inPeriod(day) ? "days" : inPrior(day) ? "prior" : null;
    if (!target) return;
    const key = symptomKey(code, custom);
    const slot = slots.get(key) ?? {
      code,
      label: (code ? labels.get(code) : null) ?? custom ?? code ?? "Symptom",
      days: new Map(),
      prior: new Map(),
      sources: new Set<Source>(),
    };
    // One value per symptom per day: the worst one reported.
    slot[target].set(day, Math.max(slot[target].get(day) ?? 0, severity));
    if (target === "days") slot.sources.add(source);
    slots.set(key, slot);
  };

  const periodCheckins = input.checkins.filter((c) => inPeriod(c.day)).sort((a, b) => a.day.localeCompare(b.day));
  for (const c of input.checkins) {
    for (const e of c.entries) record(e.symptom_code, e.custom_label, c.day, e.severity, "checkin");
  }
  const periodObs = input.observations.filter((o) => inPeriod(o.observed_on));
  for (const o of input.observations) {
    if (o.severity !== null) record(o.symptom_code, o.custom_label, o.observed_on, o.severity, "chat");
  }

  const symptoms: SymptomStat[] = [];
  for (const slot of slots.values()) {
    if (slot.days.size === 0) continue;
    const values = [...slot.days.values()];
    const first = [...slot.days].filter(([d]) => d < midpoint).map(([, v]) => v);
    const second = [...slot.days].filter(([d]) => d >= midpoint).map(([, v]) => v);
    const enough = first.length >= MIN_DAYS_PER_HALF && second.length >= MIN_DAYS_PER_HALF;
    const delta = enough ? mean(second) - mean(first) : 0;
    const prior = [...slot.prior.values()];
    symptoms.push({
      code: slot.code,
      label: slot.label,
      days_logged: values.length,
      days_present: values.filter((v) => v >= PRESENT_MIN_SEVERITY).length,
      mean_severity: round1(mean(values)),
      max_severity: Math.max(...values),
      last_logged: [...slot.days.keys()].sort().pop()!,
      first_half_mean: first.length ? round1(mean(first)) : null,
      second_half_mean: second.length ? round1(mean(second)) : null,
      trend: !enough ? "insufficient_data" : delta >= TREND_THRESHOLD - 1e-9 ? "worse" : delta <= -TREND_THRESHOLD + 1e-9 ? "better" : "stable",
      prior_period_mean: prior.length >= MIN_DAYS_PRIOR ? round1(mean(prior)) : null,
      change_vs_prior: prior.length >= MIN_DAYS_PRIOR ? round1(mean(values) - mean(prior)) : null,
      sources: [...slot.sources].sort() as Source[],
    });
  }
  symptoms.sort((a, b) => b.days_present - a.days_present || b.mean_severity - a.mean_severity || a.label.localeCompare(b.label));

  const bleedingSlot = slots.get("bleeding");
  const bleedingDates = bleedingSlot ? [...bleedingSlot.days].filter(([, v]) => v >= PRESENT_MIN_SEVERITY).map(([d]) => d).sort() : [];

  const daily = periodCheckins.map((c) => {
    const max = c.entries.length ? Math.max(...c.entries.map((e) => e.severity)) : null;
    return {
      day: c.day,
      status: dayStatus(max),
      max_severity: max,
      symptoms: c.entries.map((e) => ({
        code: e.symptom_code,
        label: (e.symptom_code ? labels.get(e.symptom_code) : null) ?? e.custom_label ?? "Symptom",
        severity: e.severity,
      })),
    };
  });

  const notes = periodCheckins
    .filter((c) => clip(c.note))
    .slice(-MAX_NOTES)
    .map((c) => ({ day: c.day, text: clip(c.note)! }));

  const highlights = [...periodObs]
    .sort((a, b) => (b.severity ?? 0) - (a.severity ?? 0) || b.observed_on.localeCompare(a.observed_on))
    .slice(0, MAX_HIGHLIGHTS)
    .map((o) => ({
      date: o.observed_on,
      symptom: (o.symptom_code ? labels.get(o.symptom_code) : null) ?? o.custom_label ?? "Symptom",
      severity: o.severity,
      excerpt: clip(o.excerpt),
    }));

  const nights = input.nights.filter((n) => inPeriod(n.night_of)).sort((a, b) => a.night_of.localeCompare(b.night_of));

  return {
    version: REPORT_VERSION,
    generated_at: generatedAt,
    appointment: input.appointment,
    period: { start, end, days: PERIOD_DAYS },
    patient: input.profile,
    data_quality: {
      checkin_days: periodCheckins.length,
      days_in_period: PERIOD_DAYS,
      coverage: Math.round((periodCheckins.length / PERIOD_DAYS) * 100) / 100,
      chat_observations: periodObs.length,
      wearable_nights: nights.length,
    },
    monitoring_plan: input.planCodes.map((code) => ({ code, label: labels.get(code) ?? code })),
    symptoms,
    bleeding: { days: bleedingDates.length, dates: bleedingDates },
    daily,
    notes,
    chat_highlights: highlights,
    wearables: {
      providers: [...input.providers].sort(),
      nights: nights.length,
      avg_sleep_minutes: avg(nights.map((n) => n.sleep_minutes), 0),
      avg_awakenings: avg(nights.map((n) => n.awakenings)),
      avg_resting_hr: avg(nights.map((n) => n.resting_hr), 0),
      avg_skin_temp_delta_c: avg(nights.map((n) => n.skin_temp_delta_c)),
      series: nights.map(({ provider: _p, ...rest }) => rest),
    },
    disclaimer: DISCLAIMER,
  };
}
