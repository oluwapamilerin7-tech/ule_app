import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComposeHeader, ComposeKinds } from '@/components/compose';
import { Card, Row } from '@/components/ui/card';
import { Avatar, Checkbox, Chip } from '@/components/ui/controls';
import { KeyboardFocusProvider, useKeyboardSpace } from '@/components/ui/keyboard';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { addDays, combineDateTime, formatShortDate, fromISODate, toISODate } from '@/lib/dates';
import { EVENT_REMINDERS } from '@/state/adapters';
import { useHousehold } from '@/state/household';
import { canCreateEvents } from '@/state/permissions';
import { currentUser, ROLE_LABELS } from '@/state/selectors';

const REMINDERS = EVENT_REMINDERS.map((r) => r.label);

export default function NewEventScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state, actions } = useHousehold();
  const insets = useSafeAreaInsets();
  const { areaRef, scrollRef, space: keyboardSpace, onFocus: onInputFocus, onScroll } = useKeyboardSpace();
  const me = currentUser(state);
  const editing = id ? state.events.find((e) => e.id === id) : undefined;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  // "Who's going?" is also who can see it. The creator is always included.
  const [going, setGoing] = useState<string[]>(editing?.invitees.map((i) => i.memberId) ?? []);
  const [reminders, setReminders] = useState<string[]>(editing?.reminders ?? ['Day before, 7pm', 'Morning of']);
  const [place, setPlace] = useState(editing?.place ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [prepTask, setPrepTask] = useState(!editing && me?.role === 'admin');
  const draft = state.draft;
  const creatorId = editing?.createdBy ?? me?.id;
  const others = state.members.filter((m) => m.id !== creatorId);
  const creator = state.members.find((m) => m.id === creatorId);

  useEffect(() => {
    const start = editing ? new Date(editing.startsAt) : addDays(new Date(), 1);
    actions.resetDraft({
      date: toISODate(start),
      time: editing?.start ?? '9:00am',
      endTime: editing?.end ?? null,
      repeat: editing?.repeat ?? null,
      repeatRule: editing?.repeatRule ?? null,
    });
  }, [actions, editing]);

  const date = draft.date ? fromISODate(draft.date) : new Date();
  const everyone = others.length > 0 && others.every((m) => going.includes(m.id));

  if (!me || (!editing && !canCreateEvents(me))) {
    return (
      <View style={styles.root}>
        <ComposeHeader title="New event" canSave={false} onSave={() => {}} />
        <View style={styles.content}>
          <Text muted>{"You can view events you're invited to, but only Admins and children create them."}</Text>
        </View>
      </View>
    );
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const save = () => {
    const isoDate = draft.date ?? toISODate(date);
    const startsAt = combineDateTime(isoDate, allDay ? null : (draft.time ?? '9:00am'));
    const endsAt = !allDay && draft.endTime ? combineDateTime(isoDate, draft.endTime) : null;
    void actions.saveEvent(
      {
        title: title.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt && endsAt > startsAt ? endsAt.toISOString() : null,
        allDay,
        place: place.trim() || null,
        notes: notes.trim() || null,
        repeat: draft.repeatRule,
        reminders: EVENT_REMINDERS.filter((r) => reminders.includes(r.label)).map((r) => r.code),
        inviteeIds: going.filter((memberId) => memberId !== creatorId),
        // The server adds "Get ready for …" to my tasks for the evening before.
        prepTask: prepTask && !editing && me.role === 'admin',
      },
      editing?.id,
    );
    router.back();
  };

  return (
    <View style={styles.root}>
      <ComposeHeader
        title={editing ? 'Edit event' : 'New event'}
        canSave={!!title.trim()}
        onSave={save}
        saveTone="coral"
      />
      {editing ? null : <ComposeKinds current="event" />}
      <View ref={areaRef} style={[styles.flex, { paddingBottom: keyboardSpace }]}>
        <KeyboardFocusProvider value={onInputFocus}>
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}>
          <TextField
            label="Event"
            labelStyle="caps"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Inter-house sports"
            autoFocus={!editing}
            fontSize={18}
            bold
          />

          <Card divided>
            <Row
              title="All day"
              right={<Checkbox checked={allDay} onChange={setAllDay} label="All day" />}
            />
            <Row
              title="Starts"
              value={`${formatShortDate(date)}${allDay ? '' : ` · ${draft.time ?? '9:00am'}`}`}
              onPress={() => router.push('/date-time')}
              chevron={false}
            />
            {allDay ? null : (
              <Row
                title="Ends"
                value={draft.endTime ?? 'Add end time'}
                onPress={() => router.push({ pathname: '/date-time', params: { field: 'end' } })}
                chevron={false}
              />
            )}
            <Row
              title="Repeat"
              value={draft.repeat ?? 'Never'}
              onPress={() => router.push('/repeat')}
              chevron={false}
            />
          </Card>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text weight="bold" size={12} muted style={styles.caps}>
                {"Who's going?"}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setGoing(everyone ? [] : others.map((m) => m.id))}
                hitSlop={8}>
                <Text weight="bold" size={13}>
                  {everyone ? 'Clear' : 'Select all'}
                </Text>
              </Pressable>
            </View>
            <Text size={12} muted>
              Only the people you select will see this on their calendar. Optional — select no one to keep it just
              for you.
            </Text>
            <Card divided>
              {creator ? (
                <View style={styles.person}>
                  <Avatar person={creator} size={32} />
                  <View style={styles.flex}>
                    <Text weight="semibold">{creator.id === me.id ? `${creator.name} (you)` : creator.name}</Text>
                    <Text size={12} muted>
                      {ROLE_LABELS[creator.role]}
                    </Text>
                  </View>
                  <Text size={12} muted>
                    Always included
                  </Text>
                </View>
              ) : null}
              {others.map((member) => {
                const selected = going.includes(member.id);
                return (
                  <Pressable
                    key={member.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={member.name}
                    onPress={() => setGoing(toggle(going, member.id))}
                    style={styles.person}>
                    <Avatar person={member} size={32} />
                    <View style={styles.flex}>
                      <Text weight="semibold">{member.name}</Text>
                      <Text size={12} muted>
                        {member.role === 'staff' ? 'Staff · view only' : ROLE_LABELS[member.role]}
                      </Text>
                    </View>
                    <Checkbox checked={selected} />
                  </Pressable>
                );
              })}
            </Card>
          </View>

          <View style={styles.field}>
            <Text weight="bold" size={12} muted style={styles.caps}>
              Remind me
            </Text>
            <View style={styles.wrap}>
              {REMINDERS.map((label) => (
                <Chip
                  key={label}
                  label={label}
                  tone="outline"
                  selected={reminders.includes(label)}
                  onPress={() => setReminders(toggle(reminders, label))}
                />
              ))}
            </View>
            <Text size={12} muted>
              Everyone going gets the same reminders.
            </Text>
          </View>

          <TextField
            label={me.role === 'child' ? 'Venue' : 'Place'}
            labelStyle="caps"
            value={place}
            onChangeText={setPlace}
            placeholder="e.g. School field"
            height={48}
            fontSize={15}
          />

          <TextField
            label={me.role === 'child' ? 'Add note' : 'Note · what to bring'}
            labelStyle="caps"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Bring house T-shirt and a water bottle."
            multiline
            maxLength={500}
            fontSize={15}
          />

          {editing || me.role !== 'admin' ? null : (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: prepTask }}
              onPress={() => setPrepTask((value) => !value)}
              style={styles.check}>
              <Checkbox checked={prepTask} size={20} />
              <Text size={14} style={styles.flex}>
                Create a prep task for {me.name} the day before
              </Text>
            </Pressable>
          )}
        </ScrollView>
        </KeyboardFocusProvider>
      </View>
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
    gap: 14,
  },
  field: {
    gap: 8,
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
