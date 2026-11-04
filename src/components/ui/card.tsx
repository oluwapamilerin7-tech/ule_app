import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

type CardProps = {
  children: ReactNode;
  /** `alert` is the coral-bordered card used for overdue and out-of-stock items. */
  tone?: 'default' | 'alert' | 'strong';
  /** Inserts a hairline between each child row. */
  divided?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, tone = 'default', divided, padded, style }: CardProps) {
  const rows = divided ? Children.toArray(children) : null;
  return (
    <View
      style={[
        styles.card,
        tone === 'alert' && styles.alert,
        tone === 'strong' && styles.strong,
        padded && styles.padded,
        style,
      ]}>
      {rows
        ? rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? (
                <View style={[styles.divider, tone === 'alert' && { backgroundColor: Palette.coralDivider }]} />
              ) : null}
              {row}
            </Fragment>
          ))
        : children}
    </View>
  );
}

type SectionLabelProps = {
  title: string;
  tone?: 'default' | 'alert';
  right?: ReactNode;
  size?: number;
};

/** Uppercase section heading ("TODAY", "NEEDS ATTENTION"). */
export function SectionLabel({ title, tone = 'default', right, size = 13 }: SectionLabelProps) {
  return (
    <View style={styles.sectionLabel}>
      <Text
        accessibilityRole="header"
        weight="bold"
        size={size}
        color={tone === 'alert' ? Palette.dangerDeep : Palette.slate}
        style={styles.caps}>
        {title}
      </Text>
      {right}
    </View>
  );
}

type InfoNoteProps = {
  icon?: IconName;
  children: ReactNode;
  tone?: 'muted' | 'alert' | 'dark' | 'plain';
  style?: StyleProp<ViewStyle>;
};

/** Grey (or coral/dark) rounded note with a leading icon. */
export function InfoNote({ icon, children, tone = 'muted', style }: InfoNoteProps) {
  const iconColor = tone === 'alert' ? Palette.danger : tone === 'dark' ? Palette.white : Palette.slate;
  return (
    <View
      style={[
        styles.note,
        tone === 'alert' && { backgroundColor: Palette.coralTint },
        tone === 'dark' && { backgroundColor: Palette.ink },
        tone === 'plain' && styles.notePlain,
        style,
      ]}>
      {icon ? <Icon name={icon} size={tone === 'plain' ? 14 : 18} color={iconColor} style={styles.noteIcon} /> : null}
      <View style={styles.noteBody}>{children}</View>
    </View>
  );
}

type TagProps = { label: string; background?: string; color?: string; size?: number };

export function Tag({ label, background = Palette.divider, color = Palette.ink, size = 12 }: TagProps) {
  return (
    <View style={[styles.tag, { backgroundColor: background }]}>
      <Text weight="bold" size={size} color={color}>
        {label}
      </Text>
    </View>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: ReactNode;
  leading?: ReactNode;
  /** Shows a chevron; defaults to true when the row is pressable. */
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Settings-style list row: title, optional subtitle, trailing value and chevron. */
export function Row({ title, subtitle, value, onPress, right, leading, chevron, style }: RowProps) {
  const showChevron = chevron ?? !!onPress;
  const content = (
    <>
      {leading}
      <View style={styles.rowText}>
        <Text weight="semibold">{title}</Text>
        {subtitle ? (
          <Text size={12} muted>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text size={14} muted numberOfLines={1} style={styles.rowValue}>
          {value}
        </Text>
      ) : null}
      {right}
      {showChevron ? <Icon name="chevron-right" size={16} color={Palette.slate} /> : null}
    </>
  );
  if (!onPress) return <View style={[styles.row, style]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  alert: {
    borderColor: Palette.coralLine,
  },
  strong: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  padded: {
    padding: 14,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.divider,
  },
  sectionLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: Palette.muted,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notePlain: {
    backgroundColor: 'transparent',
    padding: 0,
    borderRadius: 0,
    gap: 8,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteBody: {
    flex: 1,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowValue: {
    maxWidth: '50%',
  },
  pressed: {
    backgroundColor: Palette.muted,
  },
});
