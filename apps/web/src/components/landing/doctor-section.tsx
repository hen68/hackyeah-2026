import { Icon, SectionHeading } from "./brand";
import { REPORT_DAYS, REPORT_POINTS, SAMPLE_FLAGS, SAMPLE_SYMPTOMS } from "./content";

const CHECK_PATH = "M5 12.5l4.5 4.5L19 7.5";

export function DoctorSection() {
  return (
    <section id="doctor" aria-labelledby="doctor-title" className="bg-app-bg px-6 py-24">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-18 gap-y-12">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5.5">
          <SectionHeading id="doctor-title" eyebrow="For your doctor">
            Walk in with the whole picture
          </SectionHeading>
          <p className="text-xl leading-normal text-muted">
            Your pre-visit report sums up the last {REPORT_DAYS} days on one page, so the time
            with your doctor goes to what matters.
          </p>
          <ul className="flex flex-col gap-3.5">
            {REPORT_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3.5 text-[19px] leading-[1.45]">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-soft">
                  <Icon path={CHECK_PATH} size={18} strokeWidth={2.6} className="text-teal-dark" />
                </span>
                <span className="pt-0.5">{point}</span>
              </li>
            ))}
          </ul>
          <p className="rounded-2xl border-2 border-border bg-white px-5 py-4 text-lg font-semibold leading-[1.45]">
            This is not a diagnosis. Only your doctor can confirm it.
          </p>
        </div>
        <ReportPreview />
      </div>
    </section>
  );
}

function toPercent(days: number): string {
  return `${Math.round((days / REPORT_DAYS) * 100)}%`;
}

/** A static excerpt of the pre-visit report, filled with sample data. */
function ReportPreview() {
  return (
    <figure
      aria-label="Example pre-visit report"
      className="flex min-w-0 flex-[1_1_440px] flex-col gap-5 rounded-3xl bg-white p-7 shadow-[0_12px_40px_rgba(25,28,31,0.08)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-3 border-report-line pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-bold text-accent-ink">Digna</span>
          <span className="text-2xl font-bold tracking-[-0.02em]">Pre-visit report</span>
        </div>
        <span className="text-right text-[15px] leading-normal text-muted">
          Anna K., 52
          <br />
          21 Sep – 20 Oct
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-base font-bold">Flagged for discussion</span>
        <ol className="flex flex-col gap-2.5">
          {SAMPLE_FLAGS.map((flag, index) => (
            <li
              key={flag.symptom}
              className="flex items-start gap-3 rounded-xl border-[1.5px] border-report-border px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white"
              >
                {index + 1}
              </span>
              <span className="text-[15px] leading-normal">
                <strong>{flag.symptom}</strong> {flag.detail}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-base font-bold">Symptoms, last {REPORT_DAYS} days</span>
        <ul className="flex flex-col gap-2.5">
          {SAMPLE_SYMPTOMS.map((symptom) => (
            <li
              key={symptom.name}
              className="grid grid-cols-[minmax(0,7fr)_minmax(0,10fr)_minmax(0,3fr)] items-center gap-3 text-[15px]"
            >
              <span className="font-semibold">{symptom.name}</span>
              <span aria-hidden="true" className="h-2.5 rounded-full bg-report-track">
                <span
                  className="block h-2.5 rounded-full bg-report-line"
                  style={{ width: toPercent(symptom.days) }}
                />
              </span>
              <span className="text-right tabular-nums text-muted">
                {symptom.days}/{REPORT_DAYS}
                <span className="sr-only"> days</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <figcaption className="text-[13px] leading-normal text-muted">
        Example report with sample data.
      </figcaption>
    </figure>
  );
}
