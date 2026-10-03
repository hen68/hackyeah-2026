import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
  | { kind: 'circle'; cx: number; cy: number; r: number };

/** Stroke icons copied from the design canvas (24×24 viewBox). In-screen use only. */
const ICONS = {
  back: [{ kind: 'path', d: 'M15 6l-6 6 6 6' }],
  chevronRight: [{ kind: 'path', d: 'M9 6l6 6-6 6' }],
  check: [{ kind: 'path', d: 'M5 12.5l4.5 4.5L19 7.5' }],
  mic: [
    { kind: 'rect', x: 9, y: 3, width: 6, height: 11, rx: 3 },
    { kind: 'path', d: 'M5 11a7 7 0 0 0 14 0M12 18v3' },
  ],
  pencil: [{ kind: 'path', d: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4' }],
  watch: [
    { kind: 'rect', x: 6, y: 6, width: 12, height: 12, rx: 3 },
    { kind: 'path', d: 'M9 6V3h6v3M9 18v3h6v-3M12 10v2.5l1.5 1' },
  ],
  thermometer: [{ kind: 'path', d: 'M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z' }],
  heart: [{ kind: 'path', d: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' }],
  moon: [{ kind: 'path', d: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z' }],
  send: [{ kind: 'path', d: 'M12 19V5M6 11l6-6 6 6' }],
  smile: [
    { kind: 'circle', cx: 12, cy: 12, r: 9 },
    { kind: 'path', d: 'M8 12.5c1.2 2 2.6 3 4 3s2.8-1 4-3' },
  ],
  home: [{ kind: 'path', d: 'M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z' }],
  calendar: [
    { kind: 'rect', x: 4, y: 5, width: 16, height: 16, rx: 3 },
    { kind: 'path', d: 'M8 3v4M16 3v4M4 10h16' },
  ],
  document: [{ kind: 'path', d: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5' }],
  profile: [
    { kind: 'circle', cx: 12, cy: 8, r: 4 },
    { kind: 'path', d: 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6' },
  ],
} as const satisfies Record<string, readonly Shape[]>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Omit for decorative icons; they are hidden from assistive tech. */
  accessibilityLabel?: string;
};

const DEFAULT_ICON_SIZE = 24;
const DEFAULT_STROKE_WIDTH = 2;

export function Icon({
  name,
  size = DEFAULT_ICON_SIZE,
  color = colors.text,
  strokeWidth = DEFAULT_STROKE_WIDTH,
  accessibilityLabel,
}: IconProps) {
  const isDecorative = accessibilityLabel === undefined;
  const shapes: readonly Shape[] = ICONS[name];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={!isDecorative}
      accessibilityRole={isDecorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={isDecorative ? 'no-hide-descendants' : 'yes'}>
      {shapes.map((shape, index) => {
        switch (shape.kind) {
          case 'path':
            return <Path key={index} d={shape.d} />;
          case 'rect':
            return <Rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
          case 'circle':
            return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} />;
        }
      })}
    </Svg>
  );
}
