import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

const line = {
  stroke: Palette.ink,
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Small home with a tree, sun and a ticked badge (landing screen). */
export function HomeIllustration() {
  return (
    <Svg width={220} height={130} viewBox="0 0 220 130" accessibilityLabel="Illustration of a small home">
      <Circle cx="110" cy="72" r="58" fill="#F1F2F1" />
      <Circle cx="164" cy="34" r="10" fill={Palette.coral} />
      <Rect x="49.5" y="94" width="4" height="24" rx="2" fill={Palette.slate} />
      <Circle cx="51.5" cy="88" r="12" fill={Palette.slate} />
      <Rect x="72" y="62" width="76" height="56" fill={Palette.white} {...line} />
      <Path d="M64 66 110 30l46 36z" fill={Palette.ink} {...line} />
      <Rect x="132" y="36" width="9" height="18" fill={Palette.ink} />
      <Rect x="80" y="74" width="15" height="15" rx="2" fill={Palette.line} />
      <Rect x="125" y="74" width="15" height="15" rx="2" fill={Palette.line} />
      <Rect x="100" y="86" width="20" height="32" rx="3" fill={Palette.coral} />
      <Circle cx="115" cy="103" r="1.8" fill={Palette.ink} />
      <Circle cx="166" cy="112" r="7" fill={Palette.grey} />
      <Circle cx="177" cy="114" r="5" fill={Palette.grey} />
      <Path d="M36 118h152" fill="none" {...line} />
      <Circle cx="44" cy="46" r="12" fill={Palette.white} {...line} />
      <Path d="m39 46 4 4 7-8" fill="none" {...line} />
    </Svg>
  );
}

/** Simplified home used by the empty "new household" state. */
export function EmptyHomeIllustration() {
  return (
    <Svg width={120} height={80} viewBox="0 0 120 80" aria-hidden>
      <Circle cx="60" cy="44" r="34" fill="#F1F2F1" />
      <Rect x="38" y="38" width="44" height="32" fill={Palette.white} {...line} />
      <Path d="M33 41 60 20l27 21z" fill={Palette.ink} {...line} />
      <Rect x="54" y="50" width="12" height="20" rx="2" fill={Palette.coral} />
      <Path d="M20 70h80" fill="none" {...line} />
    </Svg>
  );
}
