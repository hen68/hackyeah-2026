// Pure rules for the pre-visit "things to clarify" list (US-08..US-12). No I/O.
// Copy rules: always "do doprecyzowania" (to clarify), never "błąd" (error), never a diagnosis.
// Severity is 1 none .. 5 severe, so a higher number is always worse.

export const WINDOW_DAYS = 30;
export const MISSING_TOPIC_MIN_OCCURRENCES = 5; // days with severity >= 2 in the window
export const OCCURRENCE_MIN_SEVERITY = 2;
export const DISCREPANCY_MIN_SHARE = 0.5; // of the last 14 check-ins
export const DISCREPANCY_RECENT_CHECKINS = 14;
export const DISCREPANCY_MIN_CHECKINS = 5;
export const DISCREPANCY_SEVERITY = 4;
export const NEW_SYMPTOM_MIN_DAYS = 2;
// "New" only means something if the patient was already tracking before the cut-off.
export const NEW_SYMPTOM_MIN_BASELINE_CHECKINS = 3;
export const CHANGE_THRESHOLD = 1.0;
export const CHANGE_MIN_RECORDS_PER_HALF = 3;
export const MAX_INSIGHTS = 5;
export const MAX_EXCERPTS = 3;
const EXCERPT_CHARS = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export type InsightKind = "missing_topic" | "discrepancy" | "new_symptom" | "significant_change";
export type Stance = "present" | "absent" | "improved" | "worse" | "unclear";
export type Source = "checkin" | "chat";

export type CheckinDay = {
  day: string;
  note: string | null;
  entries: { symptom_code: string | null; custom_label: string | null; severity: number }[];
};
export type ChatObservation = {
  observed_on: string;
  symptom_code: string | null;
  custom_label: string | null;
  severity: number | null;
  excerpt: string | null;
};
export type Mention = {
  symptom_code: string | null;
  custom_label: string | null;
  stance: Stance;
  quote: string;
};

export type RulesInput = {
  visitDate: string; // YYYY-MM-DD
  previousVisitDate: string | null;
  // Check-ins and chat observations from up to 2 x WINDOW_DAYS before the visit.
  checkins: CheckinDay[];
  observations: ChatObservation[];
  mentions: Mention[];
  labels: ReadonlyMap<string, string>; // catalog code -> label
};

export type Evidence = {
  entry_count: number;
  date_from: string;
  date_to: string;
  sources: Source[];
  excerpts: { date: string; source: Source; text: string }[];
};

export type InsightDraft = {
  kind: InsightKind;
  symptom_code: string | null;
  custom_label: string | null;
  title: string;
  summary: string;
  rank: number;
  evidence: Evidence;
};

const KIND_WEIGHT: Record<InsightKind, number> = {
  discrepancy: 4,
  missing_topic: 3,
  new_symptom: 2,
  significant_change: 1,
};
const TITLES: Record<InsightKind, string> = {
  missing_topic: "Temat nieporuszony",
  discrepancy: "Możliwa rozbieżność",
  new_symptom: "Nowy symptom",
  significant_change: "Istotna zmiana",
};

type Record_ = { day: string; severity: number; source: Source; text: string | null };
type Candidate = Omit<InsightDraft, "rank"> & { frequency: number; last: string };

const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);
const addDays = (day: string, n: number) => new Date(dayMs(day) + n * DAY_MS).toISOString().slice(0, 10);
const clip = (text: string | null) => (text ? text.trim().replace(/\s+/g, " ").slice(0, EXCERPT_CHARS) : null);
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function symptomKey(code: string | null, label: string | null): string {
  return code ?? `custom:${(label ?? "").trim().toLowerCase()}`;
}

function display(code: string | null, label: string | null, labels: ReadonlyMap<string, string>): string {
  return (code ? labels.get(code) : null) ?? label ?? code ?? "objaw";
}

function evidenceFor(records: Record_[]): Evidence {
  const sorted = [...records].sort((a, b) => a.day.localeCompare(b.day));
  const excerpts = [...sorted]
    .reverse()
    .filter((r) => r.text)
    .slice(0, MAX_EXCERPTS)
    .map((r) => ({ date: r.day, source: r.source, text: r.text! }));
  return {
    entry_count: sorted.length,
    date_from: sorted[0].day,
    date_to: sorted[sorted.length - 1].day,
    sources: [...new Set(sorted.map((r) => r.source))].sort() as Source[],
    excerpts,
  };
}

export function buildInsights(input: RulesInput): InsightDraft[] {
  const { visitDate, previousVisitDate, labels } = input;
  const windowStart = addDays(visitDate, -WINDOW_DAYS);
  const midpoint = addDays(visitDate, -WINDOW_DAYS / 2);
  const inWindow = (day: string) => day >= windowStart && day < visitDate;

  // Mentions, keyed so a custom label that equals a catalog label still matches its code.
  const codeByLabel = new Map([...labels].map(([code, label]) => [label.trim().toLowerCase(), code]));
  const normalise = (code: string | null, label: string | null) =>
    code ?? codeByLabel.get((label ?? "").trim().toLowerCase()) ?? null;
  const stances = new Map<string, Stance[]>();
  for (const m of input.mentions) {
    const key = symptomKey(normalise(m.symptom_code, m.custom_label), m.custom_label);
    stances.set(key, [...(stances.get(key) ?? []), m.stance]);
  }

  // Records per symptom, from check-ins and chat.
  const bySymptom = new Map<string, { code: string | null; label: string | null; records: Record_[] }>();
  const add = (code: string | null, label: string | null, record: Record_) => {
    const normalised = normalise(code, label);
    const key = symptomKey(normalised, label);
    const slot = bySymptom.get(key) ?? { code: normalised, label: normalised ? null : label, records: [] };
    slot.records.push(record);
    bySymptom.set(key, slot);
  };
  const recent = input.checkins.filter((c) => c.day < visitDate);
  for (const c of recent) {
    for (const e of c.entries) {
      add(e.symptom_code, e.custom_label, { day: c.day, severity: e.severity, source: "checkin", text: clip(c.note) });
    }
  }
  for (const o of input.observations) {
    if (o.severity === null || o.observed_on >= visitDate) continue;
    add(o.symptom_code, o.custom_label, {
      day: o.observed_on,
      severity: o.severity,
      source: "chat",
      text: clip(o.excerpt),
    });
  }

  // The last 14 check-ins before the visit (a check-in with no entry for a symptom counts as "not bad").
  const lastCheckins = recent
    .filter((c) => c.day >= windowStart)
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, DISCREPANCY_RECENT_CHECKINS);

  // Was the patient tracking in the 30 days before the cut-off (previous visit, else the window start)?
  const cut = previousVisitDate ?? windowStart;
  const baselineFrom = addDays(cut, -WINDOW_DAYS);
  const baselineTracked =
    input.checkins.filter((c) => c.day >= baselineFrom && c.day <= cut).length >= NEW_SYMPTOM_MIN_BASELINE_CHECKINS;

  const candidates: Candidate[] = [];
  for (const [key, { code, label, records }] of bySymptom) {
    const name = display(code, label, labels);
    const symptom = { symptom_code: code, custom_label: label };
    const windowRecords = records.filter((r) => inWindow(r.day));
    const occurrenceDays = new Set(
      windowRecords.filter((r) => r.severity >= OCCURRENCE_MIN_SEVERITY).map((r) => r.day),
    );
    const mentioned = stances.get(key) ?? [];
    const found: Candidate[] = [];
    const lastOf = (rs: Record_[]) => rs.reduce((acc, r) => (r.day > acc ? r.day : acc), "");

    // US-09: the check-ins say "bad" but the interview says "absent" or "improved".
    if (lastCheckins.length >= DISCREPANCY_MIN_CHECKINS && mentioned.some((s) => s === "absent" || s === "improved")) {
      const bad = lastCheckins
        .map((c) => ({ c, e: c.entries.filter((e) => symptomKey(normalise(e.symptom_code, e.custom_label), e.custom_label) === key) }))
        .filter(({ e }) => e.some((x) => x.severity >= DISCREPANCY_SEVERITY));
      if (bad.length / lastCheckins.length >= DISCREPANCY_MIN_SHARE) {
        const said = mentioned.includes("absent") ? "objaw nie został zgłoszony" : "pacjentka mówiła o poprawie";
        found.push({
          kind: "discrepancy",
          ...symptom,
          title: TITLES.discrepancy,
          summary: `${bad.length}/${lastCheckins.length} ostatnich check-inów wskazywało silne nasilenie objawu „${name}”, a w rozmowie ${said}. Do doprecyzowania.`,
          evidence: evidenceFor(bad.map(({ c }) => ({ day: c.day, severity: DISCREPANCY_SEVERITY, source: "checkin" as Source, text: clip(c.note) }))),
          frequency: bad.length,
          last: lastOf(bad.map(({ c }) => ({ day: c.day } as Record_))),
        });
      }
    }

    // US-08: frequent in the diary, not raised in the interview.
    if (mentioned.length === 0 && occurrenceDays.size >= MISSING_TOPIC_MIN_OCCURRENCES) {
      const backing = windowRecords.filter((r) => r.severity >= OCCURRENCE_MIN_SEVERITY);
      found.push({
        kind: "missing_topic",
        ...symptom,
        title: TITLES.missing_topic,
        summary: `Objaw „${name}” występował w ${occurrenceDays.size} z ostatnich ${WINDOW_DAYS} dni, a nie pojawił się w rozmowie. Do doprecyzowania.`,
        evidence: evidenceFor(backing),
        frequency: occurrenceDays.size,
        last: lastOf(backing),
      });
    }

    // US-10: first seen after the previous visit, or (no previous visit) absent in the prior window.
    const present = records.filter((r) => r.severity >= OCCURRENCE_MIN_SEVERITY && r.day < visitDate);
    const first = present.reduce((acc, r) => (acc === "" || r.day < acc ? r.day : acc), "");
    const isNew = first !== "" && (previousVisitDate ? first > previousVisitDate : first >= windowStart);
    const newDays = new Set(present.filter((r) => (previousVisitDate ? r.day > previousVisitDate : inWindow(r.day))).map((r) => r.day));
    if (isNew && baselineTracked && newDays.size >= NEW_SYMPTOM_MIN_DAYS) {
      const backing = present.filter((r) => newDays.has(r.day));
      found.push({
        kind: "new_symptom",
        ...symptom,
        title: TITLES.new_symptom,
        summary: `Objaw „${name}” pojawił się po raz pierwszy ${first} i od tego czasu wystąpił w ${newDays.size} dniach. Do doprecyzowania.`,
        evidence: evidenceFor(backing),
        frequency: newDays.size,
        last: lastOf(backing),
      });
    }

    // US-12 / §0: mean severity of the 2nd half of the window minus the 1st half.
    const checkinRecords = windowRecords.filter((r) => r.source === "checkin");
    const firstHalf = checkinRecords.filter((r) => r.day < midpoint);
    const secondHalf = checkinRecords.filter((r) => r.day >= midpoint);
    if (firstHalf.length >= CHANGE_MIN_RECORDS_PER_HALF && secondHalf.length >= CHANGE_MIN_RECORDS_PER_HALF) {
      const before = mean(firstHalf.map((r) => r.severity));
      const after = mean(secondHalf.map((r) => r.severity));
      if (Math.abs(after - before) >= CHANGE_THRESHOLD - 1e-9) {
        found.push({
          kind: "significant_change",
          ...symptom,
          title: TITLES.significant_change,
          summary: `Nasilenie objawu „${name}” ${after > before ? "wzrosło" : "spadło"} z ${before.toFixed(1)} do ${after.toFixed(1)}. Do doprecyzowania.`,
          evidence: evidenceFor(checkinRecords),
          frequency: checkinRecords.length,
          last: lastOf(checkinRecords),
        });
      }
    }

    // One item per symptom: keep the strongest kind so the list stays short.
    found.sort((a, b) => KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind]);
    if (found[0]) candidates.push(found[0]);
  }

  candidates.sort((a, b) =>
    KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind] || b.frequency - a.frequency || b.last.localeCompare(a.last)
  );
  return candidates.slice(0, MAX_INSIGHTS).map(({ frequency: _f, last: _l, ...draft }, index) => ({
    ...draft,
    rank: index + 1,
  }));
}
