import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';

/** Back button + segmented progress used by the household setup steps. */
export function StepHeader({ step, total, fallback }: { step: number; total: number; fallback: Href }) {
  return (
    <View style={styles.row}>
      <BackButton fallback={fallback} />
      <View
        style={styles.bars}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={`Step ${step} of ${total}`}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.bar, i < step && styles.done]} />
        ))}
      </View>
      <Text weight="semibold" size={13} muted>
        {step} of {total}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.line,
  },
  done: {
    backgroundColor: Palette.ink,
  },
});
