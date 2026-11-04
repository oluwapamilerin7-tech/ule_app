import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { RoleTag } from '@/components/role-tag';
import { Button } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { runsMaxHouseholds } from '@/state/selectors';

/**
 * H04 / H08 — My households: every household I belong to, my role in each, and leaving one.
 * Someone who runs no household yet can create one (they become its Primary Admin).
 */
export default function MyHouseholdsScreen() {
  const { state } = useHousehold();
  const { count, limit } = state.administering;
  const canCreate = !runsMaxHouseholds(state);

  return (
    <Screen gap={18}>
      <View style={styles.header}>
        <BackButton fallback="/home" />
        <Text accessibilityRole="header" display size={26}>
          My households
        </Text>
      </View>

      <Card divided>
        {state.myHouseholds.map((h) => (
          <View key={h.id} style={styles.row}>
            <View style={styles.icon}>
              <Icon name="home" size={20} />
            </View>
            <View style={styles.flex}>
              <Text weight="bold">{h.name}</Text>
              <View style={styles.meta}>
                <RoleTag role={h.role} isPrimary={h.isPrimary} />
                <Text size={12} muted>
                  {h.isPrimary ? 'You created it' : `Joined ${h.joined}`}
                </Text>
              </View>
              {h.isPrimary ? (
                <Text size={12} muted>
                  Can’t leave · you can delete it
                </Text>
              ) : null}
            </View>
            {!h.isPrimary && h.role !== 'child' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Leave ${h.name}`}
                onPress={() => router.push({ pathname: '/leave-household', params: { id: h.id } })}
                style={styles.leave}
                hitSlop={6}>
                <Text weight="semibold" size={13} color={Palette.danger}>
                  Leave
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </Card>
      <Text size={12} muted>
        Leaving one household doesn’t affect the others.
      </Text>

      <View style={styles.section}>
        <SectionLabel
          title="Households you run"
          right={
            <Text weight="bold" size={13}>
              {count} of {limit}
            </Text>
          }
        />
        <InfoNote icon="lock" tone="plain">
          <Text size={12} muted style={styles.note}>
            Free Plan: you can run {limit === 1 ? 'one household' : `${limit} households`} as its Primary or Supporting
            Admin. Being a Member, Staff or Child somewhere else doesn’t count.
          </Text>
        </InfoNote>
      </View>

      <View style={styles.actions}>
        <Button label="Join with an invite" icon="plus" size="md" onPress={() => router.push('/join')} />
        <Button
          label="Create a household"
          variant="outline"
          size="md"
          onPress={() =>
            router.push(canCreate ? '/create-household' : { pathname: '/plan-limit', params: { kind: 'one_household' } })
          }
        />
        {canCreate ? (
          <Text size={12} muted style={styles.center}>
            You’ll be its Primary Admin.
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  leave: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Palette.coralLine,
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  note: {
    lineHeight: 17,
  },
  actions: {
    gap: 10,
  },
  center: {
    textAlign: 'center',
  },
});
