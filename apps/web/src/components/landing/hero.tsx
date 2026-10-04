import Image from "next/image";
import appHome from "../../../public/app-home.png";
import { CONTAINER, LogoMark, StoreStatus } from "./brand";
import { DEMO_URL, NAV_LINKS } from "./content";

export function SiteHeader() {
  return (
    <header id="top" className="border-b border-line">
      <nav
        aria-label="Main"
        className={`${CONTAINER} flex min-h-20 flex-wrap items-center justify-between gap-x-8 gap-y-2 py-3`}
      >
        <a href="#top" className="flex min-h-11 items-center gap-2 font-bold text-[28px] text-ink">
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
          <span className="text-base font-semibold tracking-[0.12em] text-secondary uppercase">
            Your daily menopause companion
          </span>
          <h1
            id="hero-title"
            className="font-bold text-[clamp(44px,6.4vw,84px)] leading-[1.02] tracking-[-0.025em]"
          >
            Feel understood through menopause.
          </h1>
          <p className="max-w-[36ch] text-[clamp(20px,1.8vw,23px)] leading-[1.5] text-muted">
            Tell me how you feel, any time. Your doctor gets a clear report, with your watch data and a summary of our conversations.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-5 pt-2">
            {DEMO_URL ? (
              <>
                <a
                  href={DEMO_URL}
                  className="flex min-h-14 items-center rounded-full bg-primary px-8 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
                >
                  Try it for free
                </a>
                <a href="#how" className="flex min-h-14 items-center text-lg text-ink underline underline-offset-[6px]">
                  See how it works
                </a>
              </>
            ) : (
              <a
                href="#how"
                className="flex min-h-14 items-center rounded-full bg-primary px-8 text-lg font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                See how it works
              </a>
            )}
            <StoreStatus />
          </div>
        </div>
        <div className="relative flex justify-center lg:col-span-5">
          <div
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-[min(520px,120%)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blush"
          />
          <PhonePreview />
        </div>
      </div>
    </section>
  );
}

/** A real screenshot of the app's Home screen in a simple phone frame. */
function PhonePreview() {
  return (
    <figure className="relative w-full max-w-[340px] rounded-[48px] bg-ink p-2.5 shadow-[0_24px_60px_-20px_rgba(25,28,31,0.35)]">
      <Image
        src={appHome}
        alt="The Digna Home screen: a streak card and today's check-in asking how bad hot flushes were, on a 1 to 5 scale"
        priority
        sizes="340px"
        className="h-auto w-full rounded-[40px]"
      />
    </figure>
  );
}
