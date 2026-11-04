import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Radio } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { format24hShort } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

const MESSAGES = ['Friendly reminder — can you get to this today?', "We're running out — needed by evening."];
const CUSTOM = 'custom';

/** M03 — nudge the assignee with a push notification. */
export default function NudgeSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const [choice, setChoice] = useState<string>(MESSAGES[0]);
  const [custom, setCustom] = useState('');
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return <NotFoundSheet what="Task" />;

  const assignee = memberById(state, task.assigneeId);
  const name = assignee?.name ?? 'them';
  const quiet = state.preferences;
  const canSend = choice !== CUSTOM || custom.trim().length > 0;

  return (
    <Sheet>
      <SheetHeader title={`Nudge ${name}`} />
      <Text size={14} muted style={styles.intro}>
        About{' '}
        <Text weight="bold" size={14}>
          {task.title}
        </Text>
        {task.dueLabel && task.bucket === 'overdue' ? ` · ${task.dueLabel}` : ''}. Ulé sends it as a push
        notification.
      </Text>

      <View accessibilityRole="radiogroup" accessibilityLabel="Message" style={styles.options}>
        <Text weight="bold" size={13}>
          Message
        </Text>
        {[...MESSAGES, CUSTOM].map((message) => {
          const selected = choice === message;
          return (
            <Pressable
              key={message}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setChoice(message)}
              style={[styles.option, selected && styles.optionSelected]}>
              <Radio selected={selected} />
              <Text style={styles.flex}>{message === CUSTOM ? 'Write my own…' : message}</Text>
            </Pressable>
          );
        })}
        {choice === CUSTOM ? (
          <TextField
            value={custom}
            onChangeText={setCustom}
            placeholder={`Message to ${name}`}
            autoFocus
            multiline
            fontSize={15}
          />
        ) : null}
      </View>

      {quiet.quietHours ? (
        <InfoNote icon="clock" tone="plain">
          <Text size={12} muted>
            {name}&apos;s quiet hours start at {format24hShort(quiet.quietFrom)}. Nudges wait until morning.
          </Text>
        </InfoNote>
      ) : null}

      <Button
        label="Send nudge"
        icon="send"
        disabled={!canSend}
        onPress={() => {
          void actions.nudgeTask(task.id, choice === CUSTOM ? custom.trim() : choice);
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
  intro: {
    marginTop: -8,
    lineHeight: 20,
  },
  options: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionSelected: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
});
