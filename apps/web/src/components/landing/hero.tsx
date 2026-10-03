import { CONTAINER, LogoMark, StoreStatus } from "./brand";
import { NAV_LINKS, PREVIEW_SELECTED_SEVERITY, SEVERITY_SCALE } from "./content";

export function SiteHeader() {
  return (
    <header id="top" className="border-b border-line">
      <nav
        aria-label="Main"
        className={`${CONTAINER} flex min-h-20 flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3`}
      >
        <a href="#top" className="flex min-h-11 items-center gap-2 font-serif text-[28px] text-ink">
          <LogoMark size={26} />
          Digna
        </a>
        <ul className="flex flex-wrap gap-x-7 gap-y-1 text-lg">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="flex min-h-11 items-center text-ink underline-offset-[6px] hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden">
      <div className={`${CONTAINER} grid items-center gap-x-12 gap-y-16 py-[clamp(56px,9vw,112px)] lg:grid-cols-12`}>
        <div className="flex min-w-0 flex-col gap-7 lg:col-span-7">
          <span className="text-base font-semibold tracking-[0.12em] text-rose uppercase">
            Your daily menopause companion
          </span>
          <h1
            id="hero-title"
            className="font-serif text-[clamp(44px,6.4vw,84px)] leading-[1.02] font-normal tracking-[-0.025em]"
          >
            Feel understood through menopause.
          </h1>
          <p className="max-w-[36ch] text-[clamp(20px,1.8vw,23px)] leading-[1.5] text-muted">
            Tell me how you feel each day. Before every visit, your doctor gets a clear report.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5 pt-2">
            <a
              href="#how"
              className="flex min-h-14 items-center rounded-full bg-rose px-8 text-lg font-semibold text-white transition-colors hover:bg-rose-deep"
            >
              See how it works
            </a>
            <StoreStatus />
          </div>
        </div>
        <div className="relative flex justify-center lg:col-span-5">
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-[min(520px,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-soft"
          />
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}

/** A static picture of the app's Home check-in; not interactive. */
function PhonePreview() {
  return (
    <figure
      aria-label="Preview of the Digna daily check-in"
      className="relative w-full max-w-[340px] rounded-[48px] bg-ink p-2.5 shadow-[0_40px_80px_-24px_rgba(25,28,31,0.35)]"
    >
      <div className="flex flex-col gap-4 rounded-[40px] bg-paper px-4 pt-12 pb-6">
        <div className="flex flex-col gap-0.5 px-1">
          <span className="text-[15px] text-muted">Tuesday, 20 October</span>
          <span className="font-serif text-[26px] leading-tight">Good morning, Anna</span>
        </div>
        <div className="flex flex-col gap-3 rounded-[24px] bg-white px-4 py-5 shadow-[0_1px_2px_rgba(25,28,31,0.06)]">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold">How is today?</span>
            <span className="text-[15px] text-muted">1 of 8 done</span>
          </div>
          <div className="h-1 rounded-full bg-line">
            <div className="h-1 w-[13%] rounded-full bg-rose" />
          </div>
          <span className="pt-1 text-[17px] leading-snug font-semibold">How much did you sweat at night?</span>
          <ul className="flex flex-col gap-2">
            {SEVERITY_SCALE.map((s) => (
              <li
                key={s.value}
                className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[15px] font-medium ${
                  s.value === PREVIEW_SELECTED_SEVERITY ? "border-2 border-ink" : "border border-line"
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
    </figure>
  );
}
