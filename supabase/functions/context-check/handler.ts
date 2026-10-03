import { z } from "zod";

import { cachedMentions, type ExtractMentions } from "./extract-interview.ts";
import {
  buildInsights,
  type ChatObservation,
  type CheckinDay,
  type InsightDraft,
  type Mention,
  WINDOW_DAYS,
} from "./rules.ts";

export const RequestSchema = z.object({
  interview_id: z.string().uuid(),
  // Recompute and replace an existing result. Clinician feedback on the old insights is lost.
  refresh: z.boolean().optional(),
});

export type Interview = {
  id: string;
  patient_id: string;
  visit_at: string;
  content: string;
  extracted: unknown;
};

export type SavedCheck = {
  context_check: { id: string; period_start: string; period_end: string; created_at: string };
  insights: unknown[];
};

// Reads go through the caller's JWT (RLS = care team only). Writes use the service role.
export interface ContextStore {
  getInterview(id: string): Promise<Interview | null>;
  getPreviousVisitDate(patientId: string, visitAt: string): Promise<string | null>;
  getExistingCheck(interviewId: string): Promise<SavedCheck | null>;
  loadCatalog(): Promise<{ code: string; label: string }[]>;
  loadHistory(
    patientId: string,
    fromDay: string,
    toDay: string,
  ): Promise<{ checkins: CheckinDay[]; observations: ChatObservation[] }>;
  saveExtracted(interviewId: string, extracted: { mentions: Mention[] }): Promise<void>;
  replaceCheck(
    row: { patient_id: string; interview_id: string; period_start: string; period_end: string; insights: InsightDraft[] },
  ): Promise<SavedCheck>;
}

export type ContextDeps = { store: ContextStore; extract: ExtractMentions };
export type ContextResult = { status: number; body: Record<string, unknown> };

const DAY_MS = 24 * 60 * 60 * 1000;
const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const fail = (status: number, error: string): ContextResult => ({ status, body: { error } });

export async function handleContextCheck(
  userId: string | null,
  rawBody: unknown,
  deps: ContextDeps,
): Promise<ContextResult> {
  if (!userId) return fail(401, "Please sign in again.");
  const parsed = RequestSchema.safeParse(rawBody);
  if (!parsed.success) return fail(400, "interview_id must be a valid id.");
  const { interview_id, refresh } = parsed.data;
  const { store } = deps;

  // RLS returns nothing unless the caller is on this patient's care team.
  const interview = await store.getInterview(interview_id);
  if (!interview) return fail(404, "Interview not found.");

  if (!refresh) {
    const existing = await store.getExistingCheck(interview.id);
    if (existing) return { status: 200, body: existing };
  }

  const catalog = await store.loadCatalog();
  const codes = new Set(catalog.map((s) => s.code));

  let mentions = cachedMentions(interview.extracted, codes);
  if (mentions === null) {
    try {
      mentions = await deps.extract(interview.content, catalog);
    } catch {
      return fail(502, "The interview could not be analysed just now. Please try again.");
    }
    await store.saveExtracted(interview.id, { mentions });
  }

  const visitDate = interview.visit_at.slice(0, 10);
  const previousVisitDate = await store.getPreviousVisitDate(interview.patient_id, interview.visit_at);
  // Two windows before the visit, or back to 30 days before the previous visit if that is earlier.
  const from = [addDays(visitDate, -2 * WINDOW_DAYS), ...(previousVisitDate ? [addDays(previousVisitDate, -WINDOW_DAYS)] : [])]
    .sort()[0];
  const history = await store.loadHistory(interview.patient_id, from, visitDate);

  const insights = buildInsights({
    visitDate,
    previousVisitDate,
    checkins: history.checkins,
    observations: history.observations,
    mentions,
    labels: new Map(catalog.map((s) => [s.code, s.label])),
  });

  const saved = await store.replaceCheck({
    patient_id: interview.patient_id,
    interview_id: interview.id,
    period_start: addDays(visitDate, -WINDOW_DAYS),
    period_end: addDays(visitDate, -1),
    insights,
  });
  return { status: 200, body: saved };
}
