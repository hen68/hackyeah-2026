import { CONTAINER, Icon, LogoMark, SectionHeading, StoreStatus } from "./brand";
import {
  BUILT_WITH,
  DEMO_URL,
  DEVICES,
  FAQS,
  NAV_LINKS,
  PRIVACY_PROMISES,
  STATS,
  STEPS,
  VALUE_PROPS,
  type PrivacyIcon,
  type ValueIcon,
} from "./content";

const SECTION_Y = "py-[clamp(72px,10vw,128px)]";

export function WhyItMatters() {
  return (
    <section aria-labelledby="why-title" className="border-y border-line bg-sand">
      <div className={`${CONTAINER} grid gap-x-12 gap-y-10 py-16 lg:grid-cols-12`}>
        <h2 id="why-title" className="text-base font-semibold tracking-[0.12em] text-secondary uppercase lg:col-span-3">
          Why it matters
        </h2>
        <ul className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:col-span-9">
          {STATS.map((stat) => (
            <li key={stat.value} className="flex flex-col gap-3">
              <span className="font-bold text-[clamp(56px,6vw,80px)] leading-none tracking-[-0.03em]">
                {stat.value}
              </span>
              <p className="max-w-[34ch] text-[19px] leading-normal">{stat.body}</p>
              <a href={stat.href} className="text-base text-muted underline underline-offset-4 hover:text-ink">
                Source: {stat.source}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const VALUE_ICON_PATHS: Record<ValueIcon, string> = {
  chat: "M4 5.5h16v10H9.5L5 19.5v-4H4zM8 9.5h8M8 12h5",
  context: "M3 12h3.5l2-6 4 12 2.5-8 1.5 2H21",
};

export function ValueProps() {
  return (
    <section id="value" aria-labelledby="value-title">
      <div className={`${CONTAINER} flex flex-col gap-14 ${SECTION_Y}`}>
        <SectionHeading id="value-title" eyebrow="What you get">
          Support every day. A fuller picture for your doctor.
        </SectionHeading>
        <ul className="grid gap-x-12 gap-y-10 md:grid-cols-2">
          {VALUE_PROPS.map((prop) => (
            <li key={prop.title} className="flex flex-col gap-3 border-t border-ink pt-6">
              <Icon path={VALUE_ICON_PATHS[prop.icon]} size={28} strokeWidth={1.6} className="text-secondary" />
              <h3 className="text-[24px] leading-tight font-semibold">{prop.title}</h3>
              <p className="max-w-[48ch] text-[19px] leading-normal text-muted">{prop.body}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-4 rounded-3xl bg-sand px-8 py-8 md:flex-row md:items-center md:justify-between md:gap-12">
          <div className="flex max-w-[56ch] flex-col gap-2">
            <h3 className="text-[24px] leading-tight font-semibold">{DEVICES.title}</h3>
            <p className="text-[19px] leading-normal text-muted">{DEVICES.body}</p>
          </div>
          <ul aria-label="Data we collect from wearables" className="flex flex-wrap gap-3">
            {DEVICES.items.map((item) => (
              <li key={item} className="rounded-full border border-ink px-5 py-2 text-lg">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-title">
      <div className={`${CONTAINER} grid gap-x-12 gap-y-12 lg:grid-cols-12 ${SECTION_Y}`}>
        <div className="lg:col-span-5">
          <SectionHeading id="how-title" eyebrow="How it works">
            One minute a day. A clearer visit.
          </SectionHeading>
        </div>
        <ol className="flex flex-col lg:col-span-7">
          {STEPS.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[56px_1fr] gap-x-4 border-t border-line py-8 last:border-b">
              <span aria-hidden="true" className="font-bold text-[28px] leading-none text-secondary">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="text-[24px] leading-tight font-semibold">{step.title}</h3>
                <p className="max-w-[52ch] text-[19px] leading-normal text-muted">{step.body}</p>
              </div>
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
    <section id="privacy" aria-labelledby="privacy-title">
      <div className={`${CONTAINER} flex flex-col gap-14 ${SECTION_Y}`}>
        <SectionHeading id="privacy-title" eyebrow="Our privacy promise">
          What you tell me stays yours
        </SectionHeading>
        <ul className="grid gap-x-12 gap-y-10 md:grid-cols-3">
          {PRIVACY_PROMISES.map((promise) => (
            <li key={promise.title} className="flex flex-col gap-3 border-t border-ink pt-6">
              <Icon path={PRIVACY_ICON_PATHS[promise.icon]} size={24} strokeWidth={1.6} className="text-secondary" />
              <h3 className="text-[22px] font-semibold">{promise.title}</h3>
              <p className="text-[19px] leading-normal text-muted">{promise.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line">
      <div className={`${CONTAINER} grid gap-x-12 gap-y-10 lg:grid-cols-12 ${SECTION_Y}`}>
        <div className="lg:col-span-5">
          <SectionHeading id="faq-title" eyebrow="Questions">
            Good to know
          </SectionHeading>
        </div>
        <dl className="flex flex-col lg:col-span-7">
          {FAQS.map((faq) => (
            <div key={faq.question} className="flex flex-col gap-2 border-t border-line py-7 last:border-b">
              <dt className="text-[22px] font-semibold">{faq.question}</dt>
              <dd className="max-w-[56ch] text-[19px] leading-normal text-muted">{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section aria-labelledby="cta-title" className="bg-ink text-paper">
      <div className={`${CONTAINER} flex flex-col gap-8 py-[clamp(72px,10vw,120px)]`}>
        <h2
          id="cta-title"
          className="max-w-[18ch] font-bold text-[clamp(38px,5vw,64px)] leading-[1.05] tracking-[-0.02em]"
        >
          Coming soon to iPhone and Android.
        </h2>
        <p className="text-xl text-paper/80">Start your first check-in on launch day.</p>
        {DEMO_URL && (
          <a
            href={DEMO_URL}
            className="flex min-h-14 w-fit items-center rounded-full bg-primary px-8 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Try it for free
          </a>
        )}
        <StoreStatus className="text-paper" />
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-paper/80">
      <div className={`${CONTAINER} flex flex-col gap-10 border-t border-white/15 pt-12 pb-14`}>
        <div className="flex flex-wrap justify-between gap-x-12 gap-y-8">
          <div className="flex max-w-[52ch] flex-col gap-3">
            <span className="flex items-center gap-2 font-bold text-2xl text-paper">
              <LogoMark size={22} />
              Digna
            </span>
            <p className="text-lg leading-normal">
              Digna does not give a diagnosis or medical advice. Always talk to your doctor about
              your health.
            </p>
          </div>
          <nav aria-label="Footer">
            <ul className="flex flex-col gap-1 text-lg">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="flex min-h-11 items-center text-paper underline-offset-4 hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-white/15 pt-6 text-base">
          <span>{BUILT_WITH}</span>
          <span>© {new Date().getFullYear()} Digna</span>
        </div>
      </div>
    </footer>
  );
}
