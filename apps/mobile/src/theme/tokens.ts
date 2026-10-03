import type { TextStyle } from 'react-native';

export const colors = {
  accent: '#E0245E',
  accentPressed: '#B81C4B',
  heroGradient: ['#FFC0CD', '#FF8FA6'] as const,
  text: '#191C1F',
  textMuted: '#4B525B',
  textOnAccent: '#FFFFFF',
  border: '#E2E2E5',
  divider: '#EFEFF1',
  appBackground: '#F7F8F9',
  surface: '#FFFFFF',
  softPink: '#FFF3F5',
  softPinkStrong: '#FFEBEB',
  teal: '#1DA4A6',
  tealDark: '#13777A',
  tealSoft: '#E3F4F4',
  selectedOutline: '#191C1F',
  lavenderSoft: '#F6ECF8',
  lavender: '#9C2F8E',
  heroText: '#4A1F2C',
  flowerPetal: '#F28AA5',
  flowerCenter: '#FDE3EA',
  flowerStem: '#6B3A4A',
  progressTrack: '#F1D3DB',
  blush: '#FCE4EA',
} as const;

export const radii = {
  card: 24,
  panel: 20,
  option: 18,
  optionSmall: 16,
  pill: 999,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

/** Controls are deliberately large: the audience is 40+. */
export const sizes = {
  minTouchTarget: 44,
  primaryButtonHeight: 68,
  optionHeight: 68,
  severityRowHeight: 56,
  chipHeight: 48,
  severityDot: 28,
  checkBadge: 28,
  progressBarHeight: 6,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

type TypeStyle = Pick<TextStyle, 'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing'>;

const normalType = {
  title: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 39, letterSpacing: -0.68 },
  heading: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 30 },
  question: { fontFamily: fonts.bold, fontSize: 23, lineHeight: 29 },
  button: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  option: { fontFamily: fonts.semibold, fontSize: 21, lineHeight: 26 },
  severity: { fontFamily: fonts.semibold, fontSize: 19, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 26 },
  label: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  chip: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20 },
  badge: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 18 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof normalType;

const LARGE_TYPE_FACTOR = 1.15;

function scaleType(scale: Record<TypeVariant, TypeStyle>, factor: number) {
  return Object.fromEntries(
    Object.entries(scale).map(([key, style]) => [
      key,
      {
        ...style,
        fontSize: Math.round((style.fontSize ?? 0) * factor),
        lineHeight: Math.round((style.lineHeight ?? 0) * factor),
      },
    ]),
  ) as Record<TypeVariant, TypeStyle>;
}

export const typeScale = {
  normal: normalType,
  large: scaleType(normalType, LARGE_TYPE_FACTOR),
} as const;

/** Default type scale used by the UI kit. */
export const type = typeScale.normal;

export const SEVERITY_VALUES = [1, 2, 3, 4, 5] as const;
export type Severity = (typeof SEVERITY_VALUES)[number];

export const severityLabels: Record<Severity, string> = {
  1: 'None',
  2: 'Mild',
  3: 'Moderate',
  4: 'Strong',
  5: 'Severe',
};

export const severityColors: Record<Severity, string> = {
  1: '#1DA4A6',
  2: '#6FBF8A',
  3: '#F2B33D',
  4: '#F08A3C',
  5: '#E0245E',
};

/** Number colour on each severity dot; dark text keeps 4.5:1 contrast on the lighter dots. */
export const severityTextColors: Record<Severity, string> = {
  1: colors.text,
  2: colors.text,
  3: colors.text,
  4: colors.text,
  5: colors.textOnAccent,
};

export type DayStatus = 'good' | 'okay' | 'hard' | 'none';

/**
 * One pink family, light to deep, so a run of tougher days still reads as a garden, not a warning.
 * Every fill keeps `colors.text` above 4.5:1.
 */
export const dayStatusColors: Record<DayStatus, string> = {
  good: '#FFEEF2',
  okay: '#FFCFDB',
  hard: '#F7A6BB',
  none: colors.surface,
};
