import { LogoMark, StoreBadges } from "./brand";
import { NAV_LINKS, PREVIEW_SELECTED_SEVERITY, SEVERITY_SCALE } from "./content";

export function Hero() {
  return (
    <header id="top" className="bg-hero rounded-b-[48px] px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col">
        <nav
          aria-label="Main"
          className="flex min-h-22 flex-wrap items-center justify-between gap-x-8 gap-y-3 py-4"
        >
          <a href="#top" className="flex min-h-11 items-center gap-2.5 text-2xl font-bold text-ink">
            <span className="flex size-11 items-center justify-center rounded-full bg-white">
              <LogoMark />
            </span>
            Digna
          </a>
          <ul className="flex flex-wrap gap-x-7 gap-y-1 text-lg font-semibold">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center text-ink underline-offset-4 hover:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-end gap-x-16 gap-y-12 pt-10">
          <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-6 pb-18">
            <span className="text-[19px] font-semibold text-hero-ink">
              Your daily menopause companion
            </span>
            <h1 className="text-[clamp(40px,6vw,68px)] font-bold leading-[1.05] tracking-[-0.03em]">
              Feel understood through menopause
            </h1>
            <p className="max-w-[34ch] text-[clamp(20px,2vw,24px)] leading-[1.45]">
              Tell me how you feel each day. Before every visit, your doctor gets a clear
              report.
            </p>
            <div className="pt-2">
              <StoreBadges />
            </div>
          </div>
          <PhonePreview />
        </div>
      </div>
    </header>
  );
}

/** A static picture of the app's Home check-in; not interactive. */
function PhonePreview() {
  return (
    <figure
      aria-label="Preview of the Digna daily check-in"
      className="mx-auto min-w-0 flex-[0_1_360px] rounded-t-[48px] bg-ink px-3 pt-3"
    >
      <div className="bg-hero flex flex-col gap-3.5 rounded-t-[38px] px-4 pt-10 pb-5">
        <div className="flex flex-col gap-0.5 px-1">
          <span className="text-[15px] font-semibold text-hero-ink">Tuesday, 20 October</span>
          <span className="text-2xl font-bold tracking-[-0.02em]">Good morning, Anna</span>
        </div>
        <div className="flex flex-col gap-3 rounded-[22px] bg-white px-3.5 py-4.5 shadow-[0_6px_20px_rgba(74,31,44,0.12)]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xl font-bold">How is today?</span>
            <span className="text-[15px] font-semibold text-muted">1 of 8 done</span>
          </div>
          <div className="h-1.5 rounded-full bg-progress-track">
            <div className="h-1.5 w-[13%] rounded-full bg-accent" />
          </div>
          <div className="flex flex-col gap-2 rounded-[18px] bg-soft-pink px-3 py-3.5">
            <span className="text-lg font-bold leading-tight">
              How much did you sweat at night?
            </span>
            <ul className="flex flex-col gap-2">
              {SEVERITY_SCALE.map((s) => (
                <li
                  key={s.value}
                  className={`flex min-h-[46px] items-center gap-2.5 rounded-[14px] bg-white px-3 text-base font-semibold ${
                    s.value === PREVIEW_SELECTED_SEVERITY
                      ? "border-3 border-ink"
                      : "border-2 border-border"
                  }`}
                >
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${s.dot} ${s.ink}`}
                  >
                    {s.value}
                  </span>
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </figure>
  );
}
