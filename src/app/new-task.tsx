import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComposeHeader, ComposeKinds } from '@/components/compose';
import { Card, InfoNote } from '@/components/ui/card';
import { Avatar, Checkbox, Segmented } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { KeyboardFocusProvider, useKeyboardSpace } from '@/components/ui/keyboard';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { combineDateTime, formatClock, formatShortDate, fromISODate, toISODate } from '@/lib/dates';
import { TASK_REMINDERS } from '@/state/adapters';
import { PRESET_REPEATS, SUGGESTED_ROUTINES } from '@/state/demo-data';
import { useHousehold } from '@/state/household';
import { assignableMembers } from '@/state/permissions';
import { currentUser, taskChangeNotice } from '@/state/selectors';
import type { RepeatRule } from '@/state/types';

const REPEATS = ['Never', 'Daily', 'Weekly', 'Monthly', 'Custom'] as const;
type RepeatChoice = (typeof REPEATS)[number];
const REMINDER_LABELS = TASK_REMINDERS.map((r) => r.label);

/** Which button a rule maps to: plain daily/weekly/monthly rules are presets, the rest are Custom. */
function choiceFor(rule: RepeatRule | null | undefined): RepeatChoice {
  if (!rule) return 'Never';
  const simple = rule.interval === 1 && !rule.weekdays?.length && !rule.count && !rule.until;
  if (simple && rule.freq === 'daily') return 'Daily';
  if (simple && rule.freq === 'weekly') return 'Weekly';
  if (simple && rule.freq === 'monthly') return 'Monthly';
  return 'Custom';
}

export default function NewTaskScreen() {
  const params = useLocalSearchParams<{ id?: string; title?: string; repeat?: string }>();
  const { state, actions } = useHousehold();
  const insets = useSafeAreaInsets();
  const { areaRef, scrollRef, space: keyboardSpace, onFocus: onInputFocus, onScroll } = useKeyboardSpace();
  const me = currentUser(state);
  const editing = params.id ? state.tasks.find((t) => t.id === params.id) : undefined;
  // Suggested routines on the empty Home screen pass their repeat label.
  const initialRule = editing?.repeatRule ?? SUGGESTED_ROUTINES.find((r) => r.repeat === params.repeat)?.rule ?? null;

  const [title, setTitle] = useState(editing?.title ?? params.title ?? '');
  const [assigneeId, setAssigneeId] = useState<string | null>(editing?.assigneeId ?? me?.id ?? null);
  const [presetRepeat, setPresetRepeat] = useState<RepeatChoice>(choiceFor(initialRule));
  const [reminder, setReminder] = useState(editing?.reminder ?? REMINDER_LABELS[0]!);
  const [tellIfMissed, setTellIfMissed] = useState(editing?.tellIfMissed ?? true);
  const [notes, setNotes] = useState(editing?.notes ?? '');

  const draft = state.draft;
  const assignee = state.members.find((m) => m.id === assigneeId);
  // A custom rule from the repeat sheet wins over the preset buttons.
  const repeat: RepeatChoice = draft.repeatRule ? 'Custom' : presetRepeat;

  // Date, time and custom repeat are picked in sheets, which write to the shared draft.
  useEffect(() => {
    const due = editing?.dueAt ? new Date(editing.dueAt) : new Date();
    const custom = choiceFor(initialRule) === 'Custom' ? initialRule : null;
    actions.resetDraft({
      date: toISODate(due),
      time: editing?.dueAt && !editing.anyTime ? formatClock(due) : '10:00am',
      anyTime: editing?.anyTime ?? false,
      repeat: custom?.label ?? null,
      repeatRule: custom,
    });
  }, [actions, editing, initialRule]);

  const dueText = draft.date ? formatShortDate(fromISODate(draft.date)) : 'Today';
  const timeText = draft.anyTime ? 'Any time' : (draft.time ?? '10:00am');

  const people = me ? assignableMembers(state, me) : [];
  const staffNames = people.filter((m) => m.role === 'staff').map((m) => m.name);

  const save = () => {
    const dueAt = draft.date ? combineDateTime(draft.date, draft.anyTime ? null : timeText).toISOString() : null;
    const rule =
      repeat === 'Never' ? null : repeat === 'Custom' ? draft.repeatRule : PRESET_REPEATS[repeat];
    const submit = () => {
      void actions.saveTask(
        {
          title: title.trim(),
          assigneeId,
          dueAt,
          anyTime: draft.anyTime,
          repeat: rule,
          notes: notes.trim() || null,
          reminder: TASK_REMINDERS.find((r) => r.label === reminder)?.code ?? null,
          tellIfMissed,
        },
        editing?.id,
      );
      router.back();
    };
    // Editing someone else's task: say who will hear about it first (M04b).
    const change = editing ? taskChangeNotice(state, editing) : null;
    if (!editing || !change) {
      submit();
      return;
    }
    const creator = state.members.find((m) => m.id === editing.createdBy);
    const owner = state.members.find((m) => m.id === editing.assigneeId);
    const whose = [
      creator && creator.id !== me?.id ? `which ${creator.name} created` : null,
      owner && owner.id !== me?.id ? `assigned to ${owner.name}` : null,
    ]
      .filter(Boolean)
      .join(' and ');
    Alert.alert('Save changes?', `You're editing '${editing.title}'${whose ? `, ${whose}` : ''}.\n\n${change.notice}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save', onPress: submit },
    ]);
  };

  return (
    <View style={styles.root}>
      <ComposeHeader title={editing ? 'Edit task' : 'New task'} canSave={!!title.trim()} onSave={save} />
      {editing ? null : <ComposeKinds current="task" />}
      <View ref={areaRef} style={[styles.flex, { paddingBottom: keyboardSpace }]}>
        <KeyboardFocusProvider value={onInputFocus}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}>
          <TextField
            label="What needs to happen?"
            labelStyle="caps"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Refill cooking gas"
            autoFocus={!editing && !params.title}
            fontSize={18}
            bold
          />

          <View style={styles.field}>
            <Text weight="bold" size={12} muted style={styles.caps}>
              {"Who's responsible?"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
              {people.map((member) => {
                const selected = member.id === assigneeId;
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={member.id === me.id ? 'Me' : member.name}
                    onPress={() => setAssigneeId(member.id)}
                    style={styles.person}>
                    <Avatar person={member} size={44} ring={selected} />
                    <Text
                      weight={selected ? 'bold' : 'semibold'}
                      size={12}
                      color={selected ? Palette.ink : Palette.slate}
                      numberOfLines={1}>
                      {member.id === me.id ? 'Me' : member.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            {me?.role === 'member' && staffNames.length ? (
              <Text size={12} muted>
                You can assign tasks to yourself or {staffNames.join(' or ')}.
              </Text>
            ) : null}
          </View>

          <View style={styles.pair}>
            <PickerField label="Due" value={dueText} onPress={() => router.push('/date-time')} action="Pick" />
            <PickerField label="Time" value={timeText} onPress={() => router.push('/date-time')} />
          </View>

          <View style={styles.field}>
            <Text weight="bold" size={12} muted style={styles.caps}>
              Repeat
            </Text>
            <Segmented
              label="Repeat"
              options={REPEATS.map((value) => ({ value, label: value }))}
              value={repeat}
              onChange={(value) => {
                if (value === 'Custom') router.push('/repeat');
                else {
                  actions.setDraft({ repeat: null, repeatRule: null });
                  setPresetRepeat(value);
                }
              }}
            />
            {repeat !== 'Never' ? (
              <View style={styles.repeatNote}>
                <Icon name="repeat" size={14} />
                <Text weight="semibold" size={12} style={styles.flex}>
                  {repeat === 'Custom' && draft.repeat ? `${draft.repeat}. ` : ''}
                  Next one is created when {assignee ? (assignee.id === me?.id ? 'you mark' : `${assignee.name} marks`) : 'someone marks'} this
                  done
                </Text>
              </View>
            ) : null}
          </View>

          <Card divided>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Changes when the reminder is sent"
              onPress={() =>
                setReminder(REMINDER_LABELS[(REMINDER_LABELS.indexOf(reminder) + 1) % REMINDER_LABELS.length]!)
              }
              style={styles.optionRow}>
              <Icon name="bell" size={20} color={Palette.slate} />
              <Text weight="semibold" style={styles.flex}>
                Remind {assignee ? (assignee.id === me?.id ? 'me' : assignee.name) : 'them'}
              </Text>
              <Text size={14} muted>
                {reminder}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: tellIfMissed }}
              onPress={() => setTellIfMissed((value) => !value)}
              style={styles.optionRow}>
              <Icon name="alert" size={20} color={Palette.slate} />
              <Text weight="semibold" style={styles.flex}>
                {"Tell me if it's missed"}
              </Text>
              <Checkbox checked={tellIfMissed} />
            </Pressable>
          </Card>

          <TextField
            label="Notes"
            labelStyle="caps"
            value={notes}
            onChangeText={setNotes}
            multiline
            fontSize={15}
            placeholder="Anything they should know"
          />

          <InfoNote icon="lock" tone="plain">
            <Text size={12} muted>
              Visible to adults and the assignee.
            </Text>
          </InfoNote>
        </ScrollView>
        </KeyboardFocusProvider>
      </View>
    </View>
  );
}

function PickerField({
  label,
  value,
  onPress,
  action,
}: {
  label: string;
  value: string;
  onPress: () => void;
  action?: string;
}) {
  return (
    <View style={[styles.field, styles.flex]}>
      <View style={styles.pickerLabel}>
        <Text weight="bold" size={12} muted style={styles.caps}>
          {label}
        </Text>
        {action ? (
          <Text weight="bold" size={12}>
            {action}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value}`}
        onPress={onPress}
        style={styles.picker}>
        <Text weight="semibold">{value}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 14,
    gap: 16,
  },
  field: {
    gap: 8,
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  people: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  person: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  picker: {
    height: 46,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  repeatNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
});
