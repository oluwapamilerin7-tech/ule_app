import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Checkbox, Chip } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';

const TOPICS = ['Reminders', 'Tasks', 'Shopping', 'Something broke', 'Idea'];

/** S08 — beta feedback (MVP-20). */
export default function FeedbackSheet() {
  const [rating, setRating] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actions } = useHousehold();

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.sendFeedback({
        rating: rating ?? undefined,
        topic: topic ?? undefined,
        message: message.trim() || undefined,
        attachScreenshot: screenshot,
      });
      setSent(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Sheet centered>
        <View style={styles.thanks}>
          <Icon name="check" size={32} strokeWidth={2.4} />
        </View>
        <Text accessibilityRole="header" display size={22}>
          Thank you!
        </Text>
        <Text size={14} muted style={styles.center}>
          Every note goes straight to the team building Ulé.
        </Text>
        <Button label="Close" variant="outline" onPress={() => router.back()} style={styles.full} />
      </Sheet>
    );
  }

  return (
    <Sheet>
      <SheetHeader title="How's Ulé working for you?" />

      <View style={styles.field}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Rating" style={styles.ratings}>
          {[1, 2, 3, 4, 5].map((value) => {
            const selected = rating === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={`${value} out of 5`}
                accessibilityState={{ selected }}
                onPress={() => setRating(value)}
                style={[styles.rating, selected && styles.ratingSelected]}>
                <Text weight={selected ? 'bold' : 'semibold'} size={selected ? 15 : 13}>
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.scale}>
          <Text size={12} muted>
            Not useful
          </Text>
          <Text size={12} muted>
            {"Can't live without it"}
          </Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          {"What's this about?"}
        </Text>
        <View style={styles.wrap}>
          {TOPICS.map((option) => (
            <Chip key={option} label={option} selected={topic === option} onPress={() => setTopic(option)} />
          ))}
        </View>
      </View>

      <TextField
        label="Tell us more"
        value={message}
        onChangeText={setMessage}
        multiline
        fontSize={15}
        placeholder="What worked, what didn't, what you wish it did…"
      />

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: screenshot }}
        onPress={() => setScreenshot((value) => !value)}
        style={styles.check}>
        <Checkbox checked={screenshot} size={20} />
        <Text size={14}>Attach a screenshot of the last screen</Text>
      </Pressable>

      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}
      <Button
        label={busy ? 'Sending…' : 'Send feedback'}
        disabled={busy || (rating == null && !message.trim())}
        onPress={send}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  ratings: {
    flexDirection: 'row',
    gap: 8,
  },
  rating: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  ratingSelected: {
    backgroundColor: Palette.coral,
    borderColor: Palette.coral,
  },
  scale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  thanks: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  center: {
    textAlign: 'center',
  },
  full: {
    alignSelf: 'stretch',
  },
});
