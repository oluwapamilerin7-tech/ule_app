import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { ROLE_ACCESS } from '@/state/selectors';
import type { Role } from '@/state/types';

/** "Grace will see / Won't see" pair shown while choosing a role. */
export function RoleAccess({ role, name }: { role: Role; name: string }) {
  const access = ROLE_ACCESS[role];
  const who = name.trim() || 'They';
  return (
    <View style={styles.wrap}>
    <View style={styles.row}>
      <View style={[styles.box, { backgroundColor: Palette.divider }]}>
        <Text weight="bold" size={12}>
          {who} will see
        </Text>
        <Text size={12} style={styles.copy}>
          {access.sees}
        </Text>
      </View>
      <View style={[styles.box, { backgroundColor: Palette.muted }]}>
        <Text weight="bold" size={12}>
          {"Won't see"}
        </Text>
        <Text size={12} style={styles.copy}>
          {access.hidden}
        </Text>
      </View>
    </View>
      {role === 'staff' || role === 'child' ? (
        <Text size={12} color={Palette.slate}>
          {`Please note: ${who === 'They' ? 'they' : who} can't see the prices of items in the inventory.`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  copy: {
    lineHeight: 17,
  },
});
