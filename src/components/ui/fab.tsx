import { Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

import { Icon } from './icon';

/** Coral floating add button that sits just above the pill nav. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  // Pill nav: bottom offset + 56px tall, then the design's 26px gap.
  const bottom = Math.max(insets.bottom, 12) + 10 + 56 + 26;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.pressed]}>
      <Icon name="plus" size={26} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(246,145,117,0.45)',
  },
  pressed: {
    opacity: 0.85,
  },
});
