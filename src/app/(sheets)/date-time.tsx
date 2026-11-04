import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/ui/button';
import { Checkbox, Chip } from '@/components/ui/controls';
import { Sheet, SheetToolbar } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import {
  addDays,
  formatMonthYear,
  fromISODate,
  isSameDay,
  monthGrid,
  startOfDay,
  startOfWeek,
  toISODate,
} from '@/lib/dates';
import { useHousehold } from '@/state/household';

const QUICK_TIMES = ['7:00am', '10:00am', '1:00pm'];
const MORE_TIMES = ['6:00am', '8:00am', '9:00am', '12:00pm', '3:00pm', '4:00pm', '6:00pm', '7:00pm', '8:00pm'];

function nextSaturday(from: Date) {
  const offset = (6 - from.getDay() + 7) % 7 || 7;
  return addDays(from, offset);
}

/** M06 — date & time picker. `?field=end` picks only an end time (for events). */
export default function DateTimeSheet() {
  const { field } = useLocalSearchParams<{ field?: string }>();
  const { state, actions } = useHousehold();
  const endOnly = field === 'end';
  const today = startOfDay(new Date());

  const [date, setDate] = useState(state.draft.date ? fromISODate(state.draft.date) : today);
  const [month, setMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const initialTime = (endOnly ? state.draft.endTime : state.draft.time) ?? (endOnly ? '2:00pm' : '10:00am');
  const [time, setTime] = useState(initialTime);
  const [anyTime, setAnyTime] = useState(state.draft.anyTime);
  const [moreTimes, setMoreTimes] = useState(!QUICK_TIMES.includes(initialTime));

  const pickDate = (day: Date) => {
    setDate(day);
    setMonth(new Date(day.getFullYear(), day.getMonth(), 1));
  };

  const done = () => {
    if (endOnly) actions.setDraft({ endTime: time });
    else actions.setDraft({ date: toISODate(date), time, anyTime });
    router.back();
  };

  const quickDates = [
    { label: 'Today', date: today },
    { label: 'Tomorrow', date: addDays(today, 1) },
    { label: 'This weekend', date: nextSaturday(today) },
    { label: 'Next week', date: addDays(startOfWeek(today), 7) },
  ];

  return (
    <Sheet>
      <SheetToolbar title={endOnly ? 'Ends at' : 'Due date & time'} onDone={done} />

      {endOnly ? null : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quick}>
            {quickDates.map((quick) => (
              <Chip
                key={quick.label}
                label={quick.label}
                height={36}
                selected={isSameDay(quick.date, date)}
                onPress={() => pickDate(quick.date)}
              />
            ))}
          </ScrollView>

          <View style={styles.calendar}>
            <View style={styles.monthRow}>
              <Text weight="bold">{formatMonthYear(month)}</Text>
              <View style={styles.monthButtons}>
                <IconButton
                  icon="chevron-left"
                  label="Previous month"
                  variant="soft"
                  size={36}
                  iconSize={16}
                  onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                />
                <IconButton
                  icon="chevron-right"
                  label="Next month"
                  variant="soft"
                  size={36}
                  iconSize={16}
                  onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                />
              </View>
            </View>
            <View style={styles.grid}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, index) => (
                <Text key={index} weight="bold" size={11} muted style={styles.weekday}>
                  {letter}
                </Text>
              ))}
              {monthGrid(month).map((day) => {
                const inMonth = day.getMonth() === month.getMonth();
                const selected = isSameDay(day, date);
                const isToday = isSameDay(day, today);
                return (
                  <Pressable
                    key={day.toISOString()}
                    accessibilityRole="button"
                    accessibilityLabel={day.toDateString()}
                    accessibilityState={{ selected }}
                    onPress={() => pickDate(day)}
                    style={[
                      styles.day,
                      isToday && !selected && styles.today,
                      selected && { backgroundColor: Palette.coral },
                    ]}>
                    <Text
                      weight={selected ? 'bold' : 'semibold'}
                      size={14}
                      color={inMonth ? Palette.ink : Palette.grey}>
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </>
      )}

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Time
        </Text>
        <View style={styles.times}>
          {QUICK_TIMES.map((option) => (
            <TimeButton
              key={option}
              label={option}
              selected={!anyTime && time === option}
              onPress={() => {
                setTime(option);
                setAnyTime(false);
              }}
            />
          ))}
          <TimeButton label="Other…" selected={moreTimes} onPress={() => setMoreTimes((v) => !v)} outlined />
        </View>
        {moreTimes ? (
          <View style={styles.moreTimes}>
            {MORE_TIMES.map((option) => (
              <TimeButton
                key={option}
                label={option}
                selected={!anyTime && time === option}
                onPress={() => {
                  setTime(option);
                  setAnyTime(false);
                }}
              />
            ))}
          </View>
        ) : null}
        {endOnly ? null : (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: anyTime }}
            onPress={() => setAnyTime((value) => !value)}
            style={styles.anyTime}>
            <Checkbox checked={anyTime} size={20} />
            <Text size={14}>Any time that day</Text>
          </Pressable>
        )}
      </View>
    </Sheet>
  );
}

function TimeButton({
  label,
  selected,
  onPress,
  outlined,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  outlined?: boolean;
}) {
  const filled = selected && !outlined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.time,
        filled && styles.timeSelected,
        selected && outlined && { borderWidth: 1.5, borderColor: Palette.ink },
      ]}>
      <Text weight={selected ? 'bold' : 'semibold'} size={14} color={filled ? Palette.white : Palette.ink}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quick: {
    gap: 8,
  },
  calendar: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 18,
    padding: 12,
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  monthButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 2,
  },
  weekday: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    paddingBottom: 4,
  },
  day: {
    width: `${100 / 7}%`,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  field: {
    gap: 8,
  },
  times: {
    flexDirection: 'row',
    gap: 6,
  },
  moreTimes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  time: {
    flexGrow: 1,
    flexBasis: '22%',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSelected: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  anyTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
});
