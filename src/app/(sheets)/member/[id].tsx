import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { NotFoundSheet } from '@/components/not-found-sheet';
import { Button, IconButton } from '@/components/ui/button';
import { Card, Row } from '@/components/ui/card';
import { Avatar, Checkbox, Radio } from '@/components/ui/controls';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { isAdmin, ROLE_ACCESS, ROLE_LABELS, SUPPORTING_ADMIN_SUMMARY, supportingAdmin, tasksFor } from '@/state/selectors';
import type { Role } from '@/state/types';

const ROLES: Role[] = ['admin', 'member', 'child', 'staff'];

/** M14 — member role and permissions (FR-03). */
export default function MemberSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, actions } = useHousehold();
  const member = state.members.find((m) => m.id === id);
  const [role, setRole] = useState<Role>(member?.role ?? 'member');
  const [canUpdateSupplies, setCanUpdateSupplies] = useState(member?.canUpdateSupplies ?? true);
  const [canSendRequests, setCanSendRequests] = useState(member?.canSendRequests ?? true);
  const [canSeePrices, setCanSeePrices] = useState(member?.canSeePrices ?? false);
  if (!member) return <NotFoundSheet what="Member" />;

  const you = member.id === state.currentUserId;
  // Nobody changes the Primary Admin's role, and nobody changes their own.
  const locked = !isAdmin(state) || you || member.isPrimary;
  // One Supporting Admin per household: the option is taken when someone else holds it.
  const supporting = supportingAdmin(state);
  const adminTaken = !!supporting && supporting.id !== member.id;
  const dailyDuties = tasksFor(state, member.id).filter((t) => t.bucket === 'today').length;
  const previewPath = role === 'staff' ? '/staff-preview' : role === 'child' ? '/child-preview' : null;

  return (
    <Sheet>
      <View style={styles.header}>
        <Avatar person={member} size={52} />
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={22}>
            {member.name}
            {you ? ' (you)' : ''}
          </Text>
          <Text size={13} muted>
            Joined {member.joined} · {dailyDuties} {dailyDuties === 1 ? 'duty' : 'duties'} today
          </Text>
        </View>
        <IconButton icon="close" label="Close" variant="soft" onPress={() => router.back()} />
      </View>

      <View accessibilityRole="radiogroup" accessibilityLabel="Role" style={styles.roles}>
        {ROLES.map((option, index) => {
          const selected = option === role;
          const disabled = locked || (option === 'admin' && adminTaken);
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => setRole(option)}
              style={[styles.role, index > 0 && styles.divider, selected && styles.roleSelected]}>
              <Radio selected={selected} />
              <View style={styles.flex}>
                <Text weight={selected ? 'bold' : 'semibold'} color={disabled && !selected ? Palette.slate : undefined}>
                  {option === 'admin' ? (member.isPrimary ? 'Primary Admin' : 'Supporting Admin') : ROLE_LABELS[option]}
                </Text>
                <Text size={12} muted>
                  {option === 'admin'
                    ? member.isPrimary
                      ? 'Created the household. Runs it, with people, roles and settings.'
                      : adminTaken
                        ? `${supporting!.name} is the Supporting Admin. A household can have one.`
                        : SUPPORTING_ADMIN_SUMMARY
                    : ROLE_ACCESS[option].summary}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      {locked && isAdmin(state) ? (
        <Text size={12} muted>
          {member.isPrimary
            ? `${you ? 'You’re' : `${member.name} is`} the Primary Admin, so this role can’t be changed or removed.`
            : "You can't change your own role."}
        </Text>
      ) : null}

      {role === 'staff' ? (
        <Card divided>
          <Row
            title="Can update supplies"
            subtitle="Change quantity and status in Inventory"
            right={
              <Checkbox
                checked={canUpdateSupplies}
                onChange={setCanUpdateSupplies}
                label="Can update supplies"
                disabled={locked}
              />
            }
          />
          <Row
            title="Can send shopping requests"
            subtitle="Lists go to an admin for approval"
            right={
              <Checkbox
                checked={canSendRequests}
                onChange={setCanSendRequests}
                label="Can send shopping requests"
                disabled={locked}
              />
            }
          />
          <Row
            title="Can see inventory prices"
            subtitle="Shopping list prices are always shown while they're the shopper"
            right={
              <Checkbox
                checked={canSeePrices}
                onChange={setCanSeePrices}
                label="Can see inventory prices"
                disabled={locked}
              />
            }
          />
        </Card>
      ) : null}

      {previewPath || !you ? (
        <View style={styles.pair}>
          {previewPath ? (
            <Button
              label={`Preview as ${member.name}`}
              variant="outline"
              size="md"
              onPress={() => router.push({ pathname: previewPath, params: { id: member.id } })}
              style={styles.flex}
            />
          ) : null}
          {!you && !locked ? (
            <Button
              label="Remove"
              variant="danger-outline"
              size="md"
              onPress={() => router.push({ pathname: '/remove-member/[id]', params: { id: member.id, via: 'sheet' } })}
              style={styles.flex}
            />
          ) : null}
        </View>
      ) : null}

      {locked ? null : (
        <Button
          label="Save changes"
          onPress={() => {
            actions.updateMember(
              member.id,
              role === 'staff' ? { role, canUpdateSupplies, canSendRequests, canSeePrices } : { role },
            );
            router.back();
          }}
        />
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roles: {
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    overflow: 'hidden',
  },
  role: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  roleSelected: {
    backgroundColor: Palette.muted,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Palette.divider,
  },
  pair: {
    flexDirection: 'row',
    gap: 10,
  },
});
