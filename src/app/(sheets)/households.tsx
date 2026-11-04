import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { RoleTag } from '@/components/role-tag';
import { Button } from '@/components/ui/button';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { enterApp } from '@/lib/navigation';
import { useHousehold } from '@/state/household';
import { householdNote } from '@/state/selectors';

/** H01 / H06 / H09 / H11 — "Your households": switch between the households I belong to. */
export default function HouseholdsSheet() {
  const { state, actions } = useHousehold();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const many = state.myHouseholds.length > 1;

  const open = async (id: string) => {
    if (id === state.household.id) {
      router.back();
      return;
    }
    setBusy(id);
    setError(null);
    try {
      await actions.switchHousehold(id);
      enterApp();
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(null);
    }
  };

  return (
    <Sheet>
      <SheetHeader title="Your households" />
      <View style={styles.list}>
        {many ? (
          <Option
            icon="grid"
            title="All households"
            subtitle="Today’s tasks from each, labelled"
            onPress={() => router.replace('/all-households')}
          />
        ) : null}
        {state.myHouseholds.map((h) => (
          <Option
            key={h.id}
            icon="home"
            title={h.name}
            tag={<RoleTag role={h.role} isPrimary={h.isPrimary} />}
            subtitle={busy === h.id ? 'Opening…' : householdNote(h)}
            current={h.id === state.household.id}
            disabled={!!busy}
            onPress={() => open(h.id)}
          />
        ))}
      </View>
      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}
      <Text size={12} muted style={styles.note}>
        Each household has its own tasks, shopping list and inventory. You only see what each household shares with
        you, and your role can be different in each.
      </Text>
      <View style={styles.pair}>
        <Button
          label="Manage households"
          variant="outline"
          size="md"
          style={styles.flex}
          onPress={() => router.replace('/my-households')}
        />
        <Button
          label="Join with an invite"
          icon="plus"
          size="md"
          style={styles.flex}
          onPress={() => router.replace('/join')}
        />
      </View>
    </Sheet>
  );
}

function Option({
  icon,
  title,
  subtitle,
  tag,
  current,
  disabled,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  tag?: ReactNode;
  current?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: current, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.option, current && styles.current, pressed && { backgroundColor: Palette.muted }]}>
      <View style={styles.icon}>
        <Icon name={icon} size={20} />
      </View>
      <View style={styles.body}>
        <Text weight="bold">{title}</Text>
        <View style={styles.meta}>
          {tag}
          {subtitle ? (
            <Text size={12} muted>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {current ? (
        <View style={styles.tick}>
          <Icon name="check" size={14} color={Palette.white} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    backgroundColor: Palette.surface,
  },
  current: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 4,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    lineHeight: 17,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
});
