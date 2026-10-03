// Turns the model's raw `record_turn` output into rows that satisfy the DB constraints.
// The model output is untrusted: everything is validated and clamped here.

export type Observation = {
  symptom_code: string | null;
  custom_label: string | null;
  severity: number | null;
  duration_days: number | null;
  observed_on: string;
};

export type Turn = {
  reply: string;
  clarifyingQuestion: string | null;
  observations: Observation[];
};

export const MAX_OBSERVATIONS = 10;
const MAX_BACKDATE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseDay(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
  return time;
}

function cleanLabel(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const label = value.trim().replace(/\s+/g, " ").slice(0, 60);
  return label.length > 0 ? label : null;
}

export function mapObservations(raw: unknown, catalog: ReadonlySet<string>, localDate: string): Observation[] {
  if (!Array.isArray(raw)) return [];
  const today = parseDay(localDate);
  const out: Observation[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!isRecord(item) || out.length >= MAX_OBSERVATIONS) continue;

    const code = typeof item.symptom_code === "string" ? item.symptom_code.trim() : "";
    let symptomCode: string | null = null;
    let customLabel = cleanLabel(item.custom_label);
    if (code && catalog.has(code)) {
      symptomCode = code;
      customLabel = null;
    } else if (code && !customLabel) {
      // Unknown code: keep the symptom as free text instead of dropping it.
      customLabel = cleanLabel(code.replace(/_/g, " "));
    }
    if (!symptomCode && !customLabel) continue;

    const severity = Number.isInteger(item.severity) && (item.severity as number) >= 1 && (item.severity as number) <= 5
      ? (item.severity as number)
      : null;
    const duration = Number.isInteger(item.duration_days) && (item.duration_days as number) >= 0 &&
        (item.duration_days as number) <= 3650
      ? (item.duration_days as number)
      : null;

    let observedOn = localDate;
    const asked = parseDay(item.observed_on);
    if (asked !== null && today !== null && asked <= today && today - asked <= MAX_BACKDATE_DAYS * DAY_MS) {
      observedOn = item.observed_on as string;
    }

    const key = `${symptomCode ?? customLabel!.toLowerCase()}|${observedOn}`;
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({ symptom_code: symptomCode, custom_label: customLabel, severity, duration_days: duration, observed_on: observedOn });
  }
  return out;
}

export const MAX_REPLY_CHARS = 1500;

export function parseTurn(
  toolInput: unknown,
  fallbackText: string,
  catalog: ReadonlySet<string>,
  localDate: string,
): Turn | null {
  if (isRecord(toolInput) && typeof toolInput.reply === "string" && toolInput.reply.trim()) {
    const question = typeof toolInput.clarifying_question === "string" ? toolInput.clarifying_question.trim() : "";
    return {
      reply: toolInput.reply.trim().slice(0, MAX_REPLY_CHARS),
      clarifyingQuestion: question ? question.slice(0, 300) : null,
      observations: mapObservations(toolInput.observations, catalog, localDate),
    };
  }
  // The model answered in plain text without calling the tool: keep the reply, record nothing.
  const text = fallbackText.trim();
  if (text) return { reply: text.slice(0, MAX_REPLY_CHARS), clarifyingQuestion: null, observations: [] };
  return null;
}

// The reply shown to the patient: the answer plus the optional follow-up question.
export function replyText(turn: Turn): string {
  if (!turn.clarifyingQuestion) return turn.reply;
  return turn.reply.includes(turn.clarifyingQuestion) ? turn.reply : `${turn.reply} ${turn.clarifyingQuestion}`;
}
