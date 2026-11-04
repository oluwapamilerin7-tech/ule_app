import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { RoleAccess } from '@/components/role-access';
import { StepHeader } from '@/components/step-header';
import { Button } from '@/components/ui/button';
import { Card, Tag } from '@/components/ui/card';
import { Avatar, Segmented } from '@/components/ui/controls';
import { PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { inviteMessage, shareInvite } from '@/lib/invite';
import { enterApp } from '@/lib/navigation';
import { avatarColors, initialsFor } from '@/state/demo-data';
import { useHousehold } from '@/state/household';
import { currentUser, ROLE_LABELS } from '@/state/selectors';
import type { Role } from '@/state/types';

const ROLES = (['admin', 'member', 'child', 'staff'] as const).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export default function InviteMembersScreen() {
  const { state, actions } = useHousehold();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = currentUser(state);

  /** Creates the invite on the server (for its code), then opens the share sheet. */
  const share = async () => {
    setSharing(true);
    setError(null);
    try {
      const invite = await actions.inviteMember({ name, role, channel: 'WhatsApp or SMS' });
      const shared = await shareInvite(
        inviteMessage({ name: name.trim(), householdName: state.household.name, inviterName: me.name, code: invite.code }),
      );
      // Nothing was sent, so don't leave an unused invite lying around.
      if (!shared) await actions.cancelInvite(invite.id);
      else setName('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen gap={18}>
      <StepHeader step={2} total={2} fallback="/create-household" />
      <PageTitle title="Who helps run your home?" subtitle="Each role sees only what it needs." />

      {state.invites.length > 0 ? (
        <Card divided>
          {state.invites.map((invite, index) => (
            <View key={invite.id} style={styles.invited}>
              <Avatar person={{ initials: initialsFor(invite.name), ...avatarColors(index + 1) }} size={34} />
              <View style={styles.flex}>
                <Text weight="semibold">{invite.name}</Text>
                <Text size={12} muted>
                  {ROLE_LABELS[invite.role]} · invite {invite.sentLabel}
                </Text>
              </View>
              <Tag label="Pending" background={Palette.slateTint} color={Palette.slateDeep} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card tone="strong" padded style={styles.form}>
        <TextField
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Grace"
          autoCapitalize="words"
          height={46}
        />
        <View style={styles.roleField}>
          <Text weight="bold" size={13}>
            Role
          </Text>
          <Segmented label="Role" options={ROLES} value={role} onChange={setRole} />
        </View>
        <RoleAccess role={role} name={name} />
      </Card>

      <Spacer />

      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={sharing ? 'Opening…' : 'Share invite via WhatsApp or SMS'}
          icon="share"
          disabled={!name.trim() || sharing}
          onPress={share}
        />
        <Button label="Done — go to my household" variant="ghost" size="sm" onPress={enterApp} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  invited: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  form: {
    gap: 12,
  },
  roleField: {
    gap: 6,
  },
  actions: {
    gap: 10,
  },
});
