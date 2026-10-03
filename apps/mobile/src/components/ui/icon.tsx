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
