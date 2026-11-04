import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';

import { Icon } from './icon';
import { Text } from './text';

type Option<T extends string> = { value: T; label: string };

type SegmentedProps<T extends string> = {
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  height?: number;
  fontSize?: number;
  style?: StyleProp<ViewStyle>;
};

/** Grey track with a white raised pill for the selected option. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  height = 36,
  fontSize = 13,
  style,
}: SegmentedProps<T>) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, { height }, selected && styles.segmentSelected]}>
            <Text
              weight={selected ? 'bold' : 'semibold'}
              size={fontSize}
              color={selected ? Palette.ink : Palette.slate}
              numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** `dark` fills the selected chip; `outline` keeps it white with a dark border. */
  tone?: 'dark' | 'outline';
  dashed?: boolean;
  height?: number;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'dark',
  dashed,
  height = 34,
  leading,
  style,
}: ChipProps) {
  const dark = selected && tone === 'dark';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        { height, borderRadius: height / 2, paddingLeft: leading ? 4 : 12 },
        dark && styles.chipDark,
        selected && tone === 'outline' && styles.chipOutlineSelected,
        dashed && styles.chipDashed,
        pressed && styles.pressed,
        style,
      ]}>
      {leading}
      <Text
        weight={selected ? 'bold' : 'semibold'}
        size={13}
        color={dark ? Palette.white : dashed ? Palette.slate : Palette.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

type CheckboxProps = {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  size?: number;
  label?: string;
  disabled?: boolean;
};

/** The design's dark-accent checkbox. Pass `onChange` to make it tappable on its own. */
export function Checkbox({ checked, onChange, size = 22, label, disabled }: CheckboxProps) {
  const box = (
    <View
      style={[
        styles.checkbox,
        { width: size, height: size, borderRadius: Math.round(size / 4.5) },
        checked && styles.checkboxOn,
      ]}>
      {checked ? <Icon name="check" size={size - 6} color={Palette.white} strokeWidth={3} /> : null}
    </View>
  );
  if (!onChange) return box;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={() => onChange(!checked)}>
      {box}
    </Pressable>
  );
}

export function Radio({ selected, size = 20 }: { selected: boolean; size?: number }) {
  return (
    <View
      style={[
        styles.radio,
        { width: size, height: size, borderRadius: size / 2 },
        selected && { borderColor: Palette.ink },
      ]}>
      {selected ? (
        <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: Palette.ink }} />
      ) : null}
    </View>
  );
}

type CheckCircleProps = {
  done: boolean;
  onPress?: () => void;
  size?: number;
  /** Ring colour while not done: grey by default, coral for overdue, ink for a child's jobs. */
  tone?: 'default' | 'alert' | 'strong';
  label: string;
};

/** Round "mark as done" control used in every task list. */
export function CheckCircle({ done, onPress, size = 26, tone = 'default', label }: CheckCircleProps) {
  const ring = tone === 'alert' ? Palette.coral : tone === 'strong' ? Palette.ink : Palette.grey;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: done }}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        done ? styles.circleDone : { borderColor: ring },
      ]}>
      {done ? <Icon name="check" size={size * 0.62} color={Palette.white} /> : null}
    </Pressable>
  );
}

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Renders the middle label, e.g. "25 litres". */
  format?: (value: number) => string;
  compact?: boolean;
  label: string;
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  format,
  compact,
  label,
}: StepperProps) {
  const buttonSize = compact ? 40 : 44;
  const height = compact ? 40 : 46;
  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Less ${label}`}
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.stepperButton, { width: buttonSize, height }]}>
        <Text size={compact ? 18 : 20} color={value <= min ? Palette.grey : Palette.ink}>
          −
        </Text>
      </Pressable>
      <Text
        weight="bold"
        size={format ? 15 : 18}
        style={[styles.stepperValue, format ? { minWidth: 64 } : { width: 32 }]}>
        {format ? format(value) : value}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`More ${label}`}
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.stepperButton, { width: buttonSize, height }]}>
        <Text size={compact ? 18 : 20} color={value >= max ? Palette.grey : Palette.ink}>
          +
        </Text>
      </Pressable>
    </View>
  );
}

type AvatarProps = {
  person: { initials: string; color: string; textColor: string };
  size?: number;
  /** Selected-state ring from the assignee picker. */
  ring?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Avatar({ person, size = 28, ring, style }: AvatarProps) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: person.color },
        ring && { borderWidth: 2, borderColor: Palette.background, outlineWidth: 2, outlineColor: person.color },
        style,
      ]}>
      <Text weight="bold" size={Math.max(11, Math.round(size * 0.38))} color={person.textColor}>
        {person.initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 12,
    backgroundColor: Palette.track,
  },
  segment: {
    flex: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  segmentSelected: {
    backgroundColor: Palette.surface,
    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  chipDark: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  chipOutlineSelected: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  chipDashed: {
    borderStyle: 'dashed',
    borderColor: Palette.grey,
  },
  pressed: {
    opacity: 0.7,
  },
  checkbox: {
    borderWidth: 1.5,
    borderColor: Palette.grey,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  radio: {
    borderWidth: 1.5,
    borderColor: Palette.grey,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    borderWidth: 2,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    borderWidth: 0,
    backgroundColor: Palette.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    backgroundColor: Palette.surface,
  },
  stepperButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    textAlign: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
