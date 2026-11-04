import { StyleSheet, View } from 'react-native';

import { Palette } from '@/constants/theme';
import { passwordStrength } from '@/lib/auth';

/** Four-segment password strength bar. */
export function StrengthMeter({ password }: { password: string }) {
  const score = passwordStrength(password);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Password strength ${score} of 4`}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.bar, i < score && styles.on]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.line,
  },
  on: {
    backgroundColor: Palette.ink,
  },
});
