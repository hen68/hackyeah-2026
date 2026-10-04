import { CONTAINER, Icon, SectionHeading } from "./brand";
import { REPORT_DAYS, REPORT_POINTS, SAMPLE_FLAGS, SAMPLE_SYMPTOMS } from "./content";

const CHECK_PATH = "M5 12.5l4.5 4.5L19 7.5";

export function DoctorSection() {
  return (
    <section id="doctor" aria-labelledby="doctor-title" className="border-y border-line bg-sand">
      <div className={`${CONTAINER} grid items-center gap-x-12 gap-y-14 py-[clamp(72px,10vw,128px)] lg:grid-cols-12`}>
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-6">
          <SectionHeading id="doctor-title" eyebrow="For your doctor">
            Walk in with the whole picture
          </SectionHeading>
          <p className="max-w-[48ch] text-xl leading-normal text-muted">
            Your pre-visit report sums up the last {REPORT_DAYS} days on one page, so the time
            with your doctor goes to what matters.
          </p>
          <ul className="flex flex-col">
            {REPORT_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3.5 border-t border-line py-3.5 text-[19px] leading-[1.45] last:border-b">
                <Icon path={CHECK_PATH} size={22} strokeWidth={2} className="mt-0.5 shrink-0 text-secondary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="border-l-2 border-primary pl-4 text-lg leading-[1.45] font-semibold">
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
      className="flex min-w-0 flex-col gap-5 rounded-3xl border border-line/60 bg-white p-8 shadow-[0_4px_20px_rgba(25,28,31,0.03)] lg:col-span-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-[15px] font-semibold tracking-[0.12em] text-secondary uppercase">Digna</span>
          <span className="font-bold text-[28px] leading-tight">Pre-visit report</span>
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
              className="flex items-start gap-3 border-l-2 border-primary bg-blush/60 px-3.5 py-3"
            >
              <span
                aria-hidden="true"
                className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
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
              <span aria-hidden="true" className="h-2 rounded-full bg-sand">
                <span
                  className="block h-2 rounded-full bg-primary"
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

      <figcaption className="text-[15px] leading-normal text-muted">
        Example report with sample data.
      </figcaption>
    </figure>
  );
}
