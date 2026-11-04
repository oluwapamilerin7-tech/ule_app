import { Palette } from '@/constants/theme';

import { Text } from './text';

/** "Ulé" wordmark with the coral accent on the é. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <Text
      display="heavy"
      size={size}
      accessibilityLabel="Ulé"
      style={{ letterSpacing: -1, lineHeight: size * 1.15 }}>
      Ul
      <Text display="heavy" size={size} color={Palette.coral}>
        é
      </Text>
    </Text>
  );
}
