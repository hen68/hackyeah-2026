import { Icon, LogoMark, SectionHeading, StoreBadges } from "./brand";
import { NAV_LINKS, PRIVACY_PROMISES, STEPS, type PrivacyIcon } from "./content";

const CARD_GRID = "grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-6";

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title" className="px-6 pt-28 pb-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-12">
        <SectionHeading id="how-title" eyebrow="How it works">
          One minute a day. A clearer visit.
        </SectionHeading>
        <ol className={CARD_GRID}>
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-4.5 rounded-3xl bg-soft-pink px-7 py-8">
              <span
                aria-hidden="true"
                className="flex size-13 items-center justify-center rounded-full bg-white text-[22px] font-bold text-accent-ink"
              >
                {index + 1}
              </span>
              <h3 className="text-2xl font-bold leading-tight">{step.title}</h3>
              <p className="text-[19px] leading-normal text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const PRIVACY_ICON_PATHS: Record<PrivacyIcon, string> = {
  eye: "M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z",
  trash: "M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13",
  lock: "M7.5 10.5h9A2.5 2.5 0 0 1 19 13v5a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 18v-5a2.5 2.5 0 0 1 2.5-2.5zM8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3",
};

export function PrivacySection() {
  return (
    <section id="privacy" aria-labelledby="privacy-title" className="px-6 py-24">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-10">
        <SectionHeading
          id="privacy-title"
          eyebrow="Our privacy promise"
          eyebrowClassName="text-teal-dark"
        >
          What you tell me stays yours
        </SectionHeading>
        <ul className={CARD_GRID}>
          {PRIVACY_PROMISES.map((promise) => (
            <li key={promise.title} className="flex flex-col gap-4 rounded-3xl bg-teal-soft px-7 py-8">
              <span className="flex size-13 items-center justify-center rounded-full bg-white">
                <Icon path={PRIVACY_ICON_PATHS[promise.icon]} className="text-teal-dark" />
              </span>
              <h3 className="text-[22px] font-bold">{promise.title}</h3>
              <p className="text-[19px] leading-normal text-teal-ink">{promise.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="px-6 pb-24">
      <div className="bg-hero mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-12 gap-y-6 rounded-[40px] px-[clamp(24px,5vw,72px)] py-16">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-3">
          <h2
            id="cta-title"
            className="text-[clamp(30px,3.6vw,44px)] font-bold leading-[1.1] tracking-[-0.02em]"
          >
            Coming soon to iPhone and Android
          </h2>
          <p className="text-xl leading-[1.45]">Start your first check-in on launch day.</p>
        </div>
        <StoreBadges variant="light" />
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-divider px-6 pt-10 pb-12">
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-12 gap-y-6">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-2.5">
          <span className="flex items-center gap-2 text-xl font-bold text-accent-ink">
            <LogoMark size={24} />
            Digna
          </span>
          <p className="max-w-[52ch] text-base leading-normal text-muted">
            Digna does not give a diagnosis or medical advice. Always talk to your doctor about
            your health.
          </p>
          <span className="text-[15px] text-muted">© {new Date().getFullYear()} Digna</span>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-start gap-x-7 gap-y-1 text-[17px] font-semibold">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="flex min-h-11 items-center text-accent-ink hover:text-accent-pressed"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
