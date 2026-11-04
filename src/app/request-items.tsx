import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel } from '@/components/ui/card';
import { Chip, Stepper } from '@/components/ui/controls';
import { BackButton, PageTitle, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import type { RequestItemInput } from '@/api/endpoints';
import { useHousehold } from '@/state/household';
import { canSendRequests } from '@/state/permissions';
import { currentUser } from '@/state/selectors';

const CATEGORIES = {
  child: ['Snacks', 'School', 'Toiletries', 'Breakfast'],
  other: ['Breakfast', 'Pantry', 'Cleaning', 'Toiletries'],
};

type Line = RequestItemInput & { key: number };

/** "1 paint · Pantry" */
function lineLabel(line: Line) {
  return [`${line.qty}${line.unit ? ` ${line.unit}` : ''}`, line.category].filter(Boolean).join(' · ');
}

/**
 * E09 / C01 — build a shopping list and send it to the Admins for approval. Opened from Home,
 * Shopping, or "Request" on an inventory item (which pre-fills the item).
 */
export default function RequestItemsScreen() {
  const params = useLocalSearchParams<{ name?: string; inventoryItemId?: string; unit?: string }>();
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const admins = state.members.filter((m) => m.role === 'admin').map((m) => m.name);
  const categories = me?.role === 'child' ? CATEGORIES.child : CATEGORIES.other;

  const [name, setName] = useState(params.name ?? '');
  const [qty, setQty] = useState(1);
  const [category, setCategory] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [sending, setSending] = useState(false);
  // An inventory item only links to the first line made from it.
  const [linkedId, setLinkedId] = useState(params.inventoryItemId);

  if (!me || !canSendRequests(me)) {
    return (
      <Screen>
        <BackButton fallback="/home" />
        <InfoNote icon="lock">
          <Text size={14}>{"You can't send shopping requests. Ask an admin to turn this on."}</Text>
        </InfoNote>
      </Screen>
    );
  }

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setLines((current) => [
      ...current,
      {
        key: nextKey,
        name: trimmed,
        qty,
        unit: linkedId ? (params.unit ?? null) : null,
        category,
        inventoryItemId: linkedId ?? null,
      },
    ]);
    setNextKey((k) => k + 1);
    setLinkedId(undefined);
    setName('');
    setQty(1);
    setCategory(null);
  };

  const send = async () => {
    const items = [...lines];
    // Whatever is still typed in counts too.
    if (name.trim()) items.push({ key: 0, name: name.trim(), qty, unit: null, category, inventoryItemId: linkedId ?? null });
    if (!items.length) return;
    setSending(true);
    try {
      const request = await actions.sendRequest(items.map(({ key: _key, ...item }) => item));
      router.replace(`/requests/${request.id}`);
    } catch (error) {
      Alert.alert("Couldn't send your list", error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  const total = lines.length + (name.trim() ? 1 : 0);

  return (
    <Screen gap={18}>
      <View style={styles.header}>
        <BackButton fallback="/home" />
        <View style={styles.flex} />
        <Pressable accessibilityRole="link" onPress={() => router.push('/requests')} hitSlop={8}>
          <Text weight="bold" size={14}>
            My requests
          </Text>
        </Pressable>
      </View>
      <PageTitle
        title={me.role === 'child' ? 'Request items' : 'New shopping list'}
        subtitle={`${admins.join(' or ') || 'An admin'} will ${me.role === 'child' ? 'check' : 'approve'} it`}
      />

      <Card padded style={styles.composer}>
        <View style={styles.itemRow}>
          <View style={styles.flex}>
            <TextField
              label="Item"
              labelStyle="caps"
              value={name}
              onChangeText={setName}
              placeholder={me.role === 'child' ? 'What do you need?' : "What's needed?"}
              returnKeyType="done"
              onSubmitEditing={add}
            />
          </View>
          <View style={styles.stepper}>
            <Stepper value={qty} onChange={setQty} min={1} max={99} compact label="How many" />
          </View>
        </View>
        <View style={styles.categories}>
          <Text size={12} muted>
            Category (optional):
          </Text>
          {categories.map((c) => (
            <Chip
              key={c}
              label={c}
              height={30}
              selected={category === c}
              onPress={() => setCategory(category === c ? null : c)}
            />
          ))}
        </View>
        <Button
          label={me.role === 'child' ? 'Add to my list' : 'Add to list'}
          icon="plus"
          variant="subtle"
          size="sm"
          disabled={!name.trim()}
          onPress={add}
        />
      </Card>

      <View style={styles.section}>
        <SectionLabel title={`${me.role === 'child' ? 'On my list' : 'On this list'} · ${lines.length}`} />
        {lines.length ? (
          <Card divided>
            {lines.map((line) => (
              <View key={line.key} style={styles.line}>
                <View style={styles.flex}>
                  <Text weight="semibold">{line.name}</Text>
                  <Text size={12} muted>
                    {lineLabel(line)}
                  </Text>
                </View>
                <IconButton
                  icon="close"
                  label={`Remove ${line.name}`}
                  variant="soft"
                  size={32}
                  iconSize={14}
                  onPress={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                />
              </View>
            ))}
          </Card>
        ) : (
          <Text size={13} muted>
            Add each thing you need, then send the list.
          </Text>
        )}
      </View>

      <Button
        label={total > 0 ? `Send · ${total} ${total === 1 ? 'item' : 'items'}` : 'Send'}
        icon="send"
        disabled={total === 0 || sending}
        onPress={send}
      />
      <Text size={12} muted style={styles.center}>
        Nothing is added to the household list until an admin approves it.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  composer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  stepper: {
    paddingBottom: 2,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  section: {
    gap: 8,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  center: {
    textAlign: 'center',
    color: Palette.slate,
  },
});
