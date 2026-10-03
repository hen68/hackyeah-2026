import type { ReactNode } from "react";
import { STORES, type Store } from "./content";

type IconProps = {
  path: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

/** Decorative stroke icon; colour comes from `currentColor`. */
export function Icon({ path, size = 26, strokeWidth = 2, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={path} />
    </svg>
  );
}

/** Shared page width; every section aligns to the same left edge. */
export const CONTAINER = "mx-auto w-full max-w-[1200px] px-6";

const LOGO_PATH = "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM8 12.5c1.2 2 2.6 3 4 3s2.8-1 4-3";

/** The Digna smile mark; always pair it with the "Digna" wordmark. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return <Icon path={LOGO_PATH} size={size} strokeWidth={1.8} className="text-rose" />;
}

const STORE_ICON_PATHS: Record<Store, string> = {
  "App Store":
    "M8.5 2.5h7A2.5 2.5 0 0 1 18 5v14a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19V5a2.5 2.5 0 0 1 2.5-2.5zM10.5 18.5h3",
  "Google Play": "M6 3.5l13 8.5-13 8.5z",
};

/** Plain text, not links: the apps aren't in the stores yet. */
export function StoreStatus({ className = "text-muted" }: { className?: string }) {
  return (
    <ul aria-label="Availability" className={`flex flex-wrap items-center gap-x-5 gap-y-2 text-base ${className}`}>
      {STORES.map((store) => (
        <li key={store} className="flex items-center gap-2">
          <Icon path={STORE_ICON_PATHS[store]} size={20} strokeWidth={1.6} />
          {store}
        </li>
      ))}
      <li className="font-semibold">Coming soon</li>
    </ul>
  );
}

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  children: ReactNode;
};

/** Small uppercase label over a serif heading; used by every section. */
export function SectionHeading({ id, eyebrow, children }: SectionHeadingProps) {
  return (
    <div className="flex max-w-[640px] flex-col gap-4">
      <span className="text-base font-semibold tracking-[0.12em] text-rose uppercase">{eyebrow}</span>
      <h2
        id={id}
        className="font-serif text-[clamp(34px,4.2vw,52px)] leading-[1.08] font-normal tracking-[-0.015em]"
      >
        {children}
      </h2>
    </div>
  );
}
