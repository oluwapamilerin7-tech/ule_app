import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, Row } from '@/components/ui/card';
import { Checkbox, Chip } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { parse24h } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import type { Preferences } from '@/state/types';

/** M16 — reminders & quiet hours (FR-10). Personal: each person sets their own. */
export default function RemindersSheet() {
  const { state, actions } = useHousehold();
  const [prefs, setPrefs] = useState<Preferences>(state.preferences);
  const update = (patch: Partial<Preferences>) => setPrefs((current) => ({ ...current, ...patch }));

  const fromError = parse24h(prefs.quietFrom) == null ? 'Use 24-hour time, e.g. 22:00' : undefined;
  const untilError = parse24h(prefs.quietUntil) == null ? 'Use 24-hour time, e.g. 06:00' : undefined;

  return (
    <Sheet>
      <SheetHeader title="Reminders" />

      <Card padded style={styles.quiet}>
        <Row
          title="Quiet hours"
          subtitle="Reminders wait until quiet hours end"
          style={styles.flushRow}
          right={
            <Checkbox
              checked={prefs.quietHours}
              onChange={(quietHours) => update({ quietHours })}
              label="Quiet hours"
            />
          }
        />
        {prefs.quietHours ? (
          <>
            <View style={styles.times}>
              <TextField
                label="From"
                value={prefs.quietFrom}
                onChangeText={(quietFrom) => update({ quietFrom })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                height={48}
                bold
                error={fromError}
                style={styles.flex}
              />
              <TextField
                label="Until"
                value={prefs.quietUntil}
                onChangeText={(quietUntil) => update({ quietUntil })}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                height={48}
                bold
                error={untilError}
                style={styles.flex}
              />
            </View>
            <View style={styles.chips}>
              <Chip
                label="Every day"
                selected={prefs.quietSchedule === 'every-day'}
                onPress={() => update({ quietSchedule: 'every-day' })}
              />
              <Chip
                label="Weekends later"
                selected={prefs.quietSchedule === 'weekends-later'}
                onPress={() => update({ quietSchedule: 'weekends-later' })}
              />
            </View>
          </>
        ) : null}
      </Card>

      <Card divided>
        <Row
          title="Daily summary"
          subtitle={`${prefs.dailySummaryAt} · what's due, who's on it`}
          right={
            <Checkbox
              checked={prefs.dailySummary}
              onChange={(dailySummary) => update({ dailySummary })}
              label="Daily summary"
            />
          }
        />
        <Row
          title="When someone finishes a task"
          subtitle="Only tasks I created"
          right={
            <Checkbox
              checked={prefs.taskFinished}
              onChange={(taskFinished) => update({ taskFinished })}
              label="When someone finishes a task"
            />
          }
        />
        <Row
          title="Low-stock alerts"
          subtitle="Gas, diesel and anything marked Out"
          right={
            <Checkbox
              checked={prefs.lowStockAlerts}
              onChange={(lowStockAlerts) => update({ lowStockAlerts })}
              label="Low-stock alerts"
            />
          }
        />
      </Card>

      <Text size={12} muted>
        These settings are just for you. Each person sets their own.
      </Text>

      <Button
        label="Save"
        disabled={prefs.quietHours && (!!fromError || !!untilError)}
        onPress={() => {
          actions.updatePreferences(prefs);
          router.back();
        }}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  quiet: {
    gap: 12,
  },
  flushRow: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  times: {
    flexDirection: 'row',
    gap: 10,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
});
