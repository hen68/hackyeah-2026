import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

const PETAL_ANGLES = [-90, -18, 54, 126, 198] as const;
const CENTER = { x: 20, y: 17 } as const;
const PETAL_DISTANCE = 7.5;
const PETAL_RADIUS = 7;

const petals = PETAL_ANGLES.map((angle) => {
  const radians = (angle * Math.PI) / 180;
  return { cx: CENTER.x + PETAL_DISTANCE * Math.cos(radians), cy: CENTER.y + PETAL_DISTANCE * Math.sin(radians) };
});

type FlowerProps = {
  /** Rendered height; width follows the 40×48 artwork. */
  size?: number;
};

/** The garden flower: one per check-in day. Decorative, so hidden from screen readers. */
export function Flower({ size = 48 }: FlowerProps) {
  return (
    <Svg
      width={(size * 40) / 48}
      height={size}
      viewBox="0 0 40 48"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Path d="M20 26c0 7 1 13 0 19" stroke={colors.flowerStem} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      <Path d="M20.5 38c2-4 6-5.5 9-5-1 3.6-4.6 5.6-9 5z" fill={colors.flowerStem} />
      {petals.map((petal, index) => (
        <Circle key={index} cx={petal.cx} cy={petal.cy} r={PETAL_RADIUS} fill={colors.flowerPetal} />
      ))}
      <Circle cx={CENTER.x} cy={CENTER.y} r={4.6} fill={colors.flowerCenter} />
    </Svg>
  );
}
