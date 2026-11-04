import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { FontFamily, Palette } from '@/constants/theme';

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export type TextProps = RNTextProps & {
  /** Figtree weight for body copy. Ignored when `display` is set. */
  weight?: TextWeight;
  /** Bricolage Grotesque for headings and big numbers; `'heavy'` is the 800 wordmark weight. */
  display?: boolean | 'heavy';
  size?: number;
  color?: string;
  /** Shorthand for the secondary slate text colour. */
  muted?: boolean;
};

/**
 * Custom fonts don't synthesise weights on Android, so each weight maps to its own family.
 * Nested spans need their own `size`/`color` because the defaults are applied explicitly.
 */
export function Text({
  weight = 'regular',
  display,
  size = 15,
  color,
  muted,
  style,
  ...rest
}: TextProps) {
  const fontFamily = display
    ? display === 'heavy'
      ? FontFamily.displayHeavy
      : FontFamily.display
    : FontFamily[weight];
  return (
    <RNText
      {...rest}
      style={[{ fontFamily, fontSize: size, color: color ?? (muted ? Palette.slate : Palette.ink) }, style]}
    />
  );
}
