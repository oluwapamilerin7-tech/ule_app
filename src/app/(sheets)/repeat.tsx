import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { InfoNote } from '@/components/ui/card';
import { Radio, Segmented, Stepper } from '@/components/ui/controls';
import { Sheet, SheetToolbar } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { addDays, formatShortDate, toISODate } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import type { RepeatRule } from '@/state/types';

type Unit = 'days' | 'weeks' | 'months';
type Ends = 'never' | 'term' | 'count';

/** "End of term" — roughly a school term from today. */
const TERM_DAYS = 90;

/** Monday-first, mapped to JS getDay() numbers. */
const WEEKDAYS = [
  { day: 1, letter: 'M', short: 'Mon' },
  { day: 2, letter: 'T', short: 'Tue' },
  { day: 3, letter: 'W', short: 'Wed' },
  { day: 4, letter: 'T', short: 'Thu' },
  { day: 5, letter: 'F', short: 'Fri' },
  { day: 6, letter: 'S', short: 'Sat' },
  { day: 0, letter: 'S', short: 'Sun' },
];

function joinDays(days: number[]) {
  const names = WEEKDAYS.filter((w) => days.includes(w.day)).map((w) => w.short);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/** Short label stored on the task, e.g. "Tue & Fri" or "Every 3 weeks on Tue & Fri". */
function repeatLabel(every: number, unit: Unit, days: number[]) {
  if (unit === 'days') return every === 1 ? 'Daily' : `Every ${every} days`;
  if (unit === 'months') return every === 1 ? 'Monthly' : `Every ${every} months`;
  if (days.length === 0) return every === 1 ? 'Weekly' : `Every ${every} weeks`;
  return every === 1 ? joinDays(days) : `Every ${every} weeks on ${joinDays(days)}`;
}

function nextOccurrence(unit: Unit, days: number[]) {
  const today = new Date();
  if (unit !== 'weeks' || days.length === 0) return addDays(today, 1);
  for (let i = 1; i <= 7; i += 1) {
    const candidate = addDays(today, i);
    if (days.includes(candidate.getDay())) return candidate;
  }
  return addDays(today, 7);
}

/** M05 — custom repeat (FR-05). */
export default function RepeatSheet() {
  const { actions } = useHousehold();
  const [every, setEvery] = useState(1);
  const [unit, setUnit] = useState<Unit>('weeks');
  const [days, setDays] = useState<number[]>([new Date().getDay()]);
  const [ends, setEnds] = useState<Ends>('never');

  const label = repeatLabel(every, unit, days);
  const suffix = ends === 'term' ? ' · until end of term' : ends === 'count' ? ' · 10 times' : '';

  const done = () => {
    const rule: RepeatRule = {
      freq: unit === 'days' ? 'daily' : unit === 'weeks' ? 'weekly' : 'monthly',
      interval: every,
      // The server uses ISO weekdays (Mon = 1 … Sun = 7).
      weekdays: unit === 'weeks' && days.length ? days.map((d) => (d === 0 ? 7 : d)) : undefined,
      until: ends === 'term' ? toISODate(addDays(new Date(), TERM_DAYS)) : undefined,
      count: ends === 'count' ? 10 : undefined,
      label: `${label}${suffix}`,
    };
    actions.setDraft({ repeat: rule.label, repeatRule: rule });
    router.back();
  };

  return (
    <Sheet>
      <SheetToolbar title="Custom repeat" onDone={done} />

      <View style={styles.every}>
        <Text weight="semibold" size={16}>
          Every
        </Text>
        <Stepper label="interval" value={every} onChange={setEvery} min={1} max={12} />
        <Segmented
          label="Unit"
          options={[
            { value: 'days', label: 'Days' },
            { value: 'weeks', label: 'Weeks' },
            { value: 'months', label: 'Months' },
          ]}
          value={unit}
          onChange={setUnit}
          height={38}
          style={styles.flex}
        />
      </View>

      {unit === 'weeks' ? (
        <View style={styles.field}>
          <Text weight="bold" size={13}>
            On
          </Text>
          <View style={styles.days}>
            {WEEKDAYS.map((weekday) => {
              const selected = days.includes(weekday.day);
              return (
                <Pressable
                  key={weekday.day}
                  accessibilityRole="checkbox"
                  accessibilityLabel={weekday.short}
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    setDays(selected ? days.filter((d) => d !== weekday.day) : [...days, weekday.day])
                  }
                  style={[styles.day, selected && styles.daySelected]}>
                  <Text weight={selected ? 'bold' : 'semibold'} color={selected ? Palette.white : Palette.ink}>
                    {weekday.letter}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Ends
        </Text>
        <View accessibilityRole="radiogroup" style={styles.ends}>
          {(
            [
              { value: 'never', label: 'Never' },
              { value: 'term', label: 'On a date', detail: 'End of term' },
              { value: 'count', label: 'After', detail: '10 times' },
            ] as const
          ).map((option, index) => (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: ends === option.value }}
              onPress={() => setEnds(option.value)}
              style={[styles.end, index > 0 && styles.endDivider]}>
              <Radio selected={ends === option.value} />
              <Text style={styles.flex}>{option.label}</Text>
              {'detail' in option ? (
                <Text muted>{option.detail}</Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>

      <InfoNote icon="repeat">
        <Text size={14}>
          <Text weight="bold" size={14}>
            {label}
          </Text>
          {suffix}. Next: {formatShortDate(nextOccurrence(unit, days))}.
        </Text>
      </InfoNote>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  every: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  field: {
    gap: 8,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  daySelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  ends: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
  },
  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  endDivider: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
});
