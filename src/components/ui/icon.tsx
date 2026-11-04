import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

/** Stroke icons copied from the design file (24×24, round caps and joins). */
const ICONS = {
  alert: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v4M12 16h.01" />
    </>
  ),
  'arrow-right': <Path d="M5 12h14M13 6l6 6-6 6" />,
  bell: (
    <>
      <Path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <Path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  box: (
    <>
      <Path d="M21 8 12 3 3 8v8l9 5 9-5z" />
      <Path d="M3 8l9 5 9-5M12 13v8" />
    </>
  ),
  calendar: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="3" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  cart: (
    <>
      <Path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2" />
      <Circle cx="9" cy="20" r="1.3" />
      <Circle cx="17" cy="20" r="1.3" />
    </>
  ),
  chat: <Path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z" />,
  check: <Path d="m5 12 5 5 9-10" />,
  'chevron-down': <Path d="m6 9 6 6 6-6" />,
  'chevron-left': <Path d="m15 6-6 6 6 6" />,
  'chevron-right': <Path d="m9 6 6 6-6 6" />,
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  close: <Path d="M6 6l12 12M18 6 6 18" />,
  copy: (
    <>
      <Rect x="8" y="8" width="12" height="12" rx="2" />
      <Path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  edit: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  eye: (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Path d="M3 3l18 18" />
    </>
  ),
  gear: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  grid: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="2" />
      <Rect x="14" y="3" width="7" height="7" rx="2" />
      <Rect x="3" y="14" width="7" height="7" rx="2" />
      <Rect x="14" y="14" width="7" height="7" rx="2" />
    </>
  ),
  home: <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  logout: <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />,
  mail: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="3" />
      <Path d="m4 7 8 6 8-6" />
    </>
  ),
  pin: (
    <>
      <Path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
      <Circle cx="12" cy="10" r="2.5" />
    </>
  ),
  plus: <Path d="M12 5v14M5 12h14" />,
  repeat: <Path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h16M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4" />,
  replay: <Path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />,
  send: <Path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />,
  share: <Path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />,
  sms: (
    <>
      <Rect x="3" y="5" width="18" height="13" rx="3" />
      <Path d="M7 10h10M7 14h6" />
    </>
  ),
  sun: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  sync: <Path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M18 2v4h-4M6 22v-4h4" />,
  tasks: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="4" />
      <Path d="m8 12 3 3 5-6" />
    </>
  ),
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  'user-minus': (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 11h6" />
    </>
  ),
  'user-plus': (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M19 8v6M16 11h6" />
    </>
  ),
  users: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2" />
    </>
  ),
  'wifi-off': (
    <Path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5.2-2.8M19 12.5a10 10 0 0 0-2.5-1.8M12 20h.01" />
  ),
};

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
};

export function Icon({ name, size = 18, color = Palette.ink, strokeWidth = 1.8, style }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={[{ pointerEvents: 'none' }, style]}>
      <G
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round">
        {ICONS[name]}
      </G>
    </Svg>
  );
}
