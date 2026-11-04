import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Avatar, Checkbox, Chip, Radio } from '@/components/ui/controls';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { ROLE_LABELS } from '@/state/selectors';

const WHEN = ['Today', 'Tomorrow', 'This weekend'];

/** M10 — choose who does the shopping (MVP-14). */
export default function ShopperSheet() {
  const { state, actions } = useHousehold();
  const [memberId, setMemberId] = useState(state.shopper.memberId);
  const [when, setWhen] = useState(state.shopper.when);
  const [sendNow, setSendNow] = useState(true);
  // Anyone can be the shopper — including a child (user story 1).
  const candidates = state.members;
  const chosen = candidates.find((m) => m.id === memberId);

  return (
    <Sheet>
      <SheetHeader title="Who's doing the shopping?" />

      <View accessibilityRole="radiogroup" accessibilityLabel="Shopper" style={styles.list}>
        {candidates.map((member, index) => {
          const selected = member.id === memberId;
          const you = member.id === state.currentUserId;
          const detail =
            member.role === 'admin'
              ? (member.note ?? undefined)
              : `${ROLE_LABELS[member.role]} · sees the list and prices only while shopping`;
          return (
            <Pressable
              key={member.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setMemberId(member.id)}
              style={[styles.row, index > 0 && styles.divider]}>
              <Avatar person={member} size={34} />
              <View style={styles.flex}>
                <Text weight="semibold">{you ? 'Me' : member.name}</Text>
                {detail ? (
                  <Text size={12} muted>
                    {detail}
                  </Text>
                ) : null}
              </View>
              <Radio selected={selected} size={22} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.field}>
        <Text weight="bold" size={13}>
          When
        </Text>
        <View style={styles.wrap}>
          {WHEN.map((option) => (
            <Chip key={option} label={option} height={38} selected={when === option} onPress={() => setWhen(option)} />
          ))}
        </View>
      </View>

      {chosen && chosen.id !== state.currentUserId ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: sendNow }}
          onPress={() => setSendNow((value) => !value)}
          style={styles.check}>
          <Checkbox checked={sendNow} size={20} />
          <Text size={14}>Send {chosen.name} the list now</Text>
        </Pressable>
      ) : null}

      <Button
        label={chosen ? `Assign ${chosen.id === state.currentUserId ? 'me' : chosen.name}` : 'Assign'}
        disabled={!chosen}
        onPress={() => {
          void actions.setShopper(memberId, when, sendNow && memberId !== state.currentUserId);
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
  list: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  field: {
    gap: 6,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
