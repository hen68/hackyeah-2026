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

const LOGO_PATH = "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM8 12.5c1.2 2 2.6 3 4 3s2.8-1 4-3";

/** The Digna smile mark; always pair it with the "Digna" wordmark. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return <Icon path={LOGO_PATH} size={size} strokeWidth={1.8} className="text-accent" />;
}

const STORE_ICON_PATHS: Record<Store, string> = {
  "App Store":
    "M8.5 2.5h7A2.5 2.5 0 0 1 18 5v14a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19V5a2.5 2.5 0 0 1 2.5-2.5zM10.5 18.5h3",
  "Google Play": "M6 3.5l13 8.5-13 8.5z",
};

/** Plain text, not links: the apps aren't in the stores yet. */
export function StoreBadges({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const tone = variant === "dark" ? "bg-ink text-white" : "bg-white text-ink";

  return (
    <ul className="flex flex-wrap gap-3" aria-label="Coming soon to">
      {STORES.map((store) => (
        <li
          key={store}
          className={`flex min-h-16 items-center gap-3 rounded-full px-6 py-2.5 ${tone}`}
        >
          <Icon path={STORE_ICON_PATHS[store]} strokeWidth={1.8} />
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-medium">Coming soon</span>
            <span className="text-[19px] font-bold">{store}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

type SectionHeadingProps = {
  id: string;
  eyebrow: string;
  children: ReactNode;
  eyebrowClassName?: string;
};

export function SectionHeading({
  id,
  eyebrow,
  children,
  eyebrowClassName = "text-accent-ink",
}: SectionHeadingProps) {
  return (
    <div className="flex max-w-[720px] flex-col gap-3.5">
      <span className={`text-lg font-bold ${eyebrowClassName}`}>{eyebrow}</span>
      <h2
        id={id}
        className="text-[clamp(32px,4vw,48px)] font-bold leading-[1.1] tracking-[-0.02em]"
      >
        {children}
      </h2>
    </div>
  );
}
