import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type Variant =
  | 'primary'
  | 'dark'
  | 'outline'
  | 'subtle'
  | 'danger'
  | 'danger-outline'
  | 'ghost';

type Size = 'lg' | 'md' | 'sm';

const HEIGHTS: Record<Size, number> = { lg: 54, md: 50, sm: 44 };

const VARIANTS: Record<Variant, { container: ViewStyle; color: string; weight: 'semibold' | 'bold' }> = {
  primary: { container: { backgroundColor: Palette.coral }, color: Palette.ink, weight: 'bold' },
  dark: { container: { backgroundColor: Palette.ink }, color: Palette.white, weight: 'bold' },
  outline: {
    container: { borderWidth: 1.5, borderColor: Palette.ink, backgroundColor: Palette.surface },
    color: Palette.ink,
    weight: 'semibold',
  },
  subtle: {
    container: { borderWidth: 1.5, borderColor: Palette.line, backgroundColor: Palette.surface },
    color: Palette.ink,
    weight: 'semibold',
  },
  danger: { container: { backgroundColor: Palette.danger }, color: Palette.white, weight: 'bold' },
  'danger-outline': {
    container: { borderWidth: 1.5, borderColor: Palette.coralLine, backgroundColor: Palette.surface },
    color: Palette.danger,
    weight: 'semibold',
  },
  ghost: { container: {}, color: Palette.slate, weight: 'semibold' },
};

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Icon after the label, e.g. the arrow on "Continue". */
  trailingIcon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  trailingIcon,
  disabled,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const spec = VARIANTS[variant];
  const height = HEIGHTS[size];
  const iconSize = size === 'lg' ? 20 : 18;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { height, borderRadius: height / 2 },
        spec.container,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}>
      {icon ? <Icon name={icon} size={iconSize} color={spec.color} /> : null}
      <Text weight={spec.weight} size={size === 'lg' ? 16 : 15} color={spec.color}>
        {label}
      </Text>
      {trailingIcon ? <Icon name={trailingIcon} size={iconSize - 2} color={spec.color} /> : null}
    </Pressable>
  );
}

type IconButtonProps = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  /** `outline` is the 44px bordered circle; `soft` is the grey 40px close/edit circle. */
  variant?: 'outline' | 'soft' | 'plain';
  size?: number;
  iconSize?: number;
  color?: string;
  badge?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'outline',
  size,
  iconSize = 18,
  color = Palette.ink,
  badge,
  style,
}: IconButtonProps) {
  const dimension = size ?? (variant === 'soft' ? 40 : 44);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => [
        styles.iconButton,
        { width: dimension, height: dimension, borderRadius: dimension / 2 },
        variant === 'outline' && styles.iconOutline,
        variant === 'soft' && styles.iconSoft,
        pressed && styles.pressed,
        style,
      ]}>
      <Icon name={icon} size={iconSize} color={color} />
      {badge ? <View style={styles.badge} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.7,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOutline: {
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  iconSoft: {
    backgroundColor: Palette.muted,
  },
  badge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.coral,
  },
});
