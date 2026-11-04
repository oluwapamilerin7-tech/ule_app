import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/ui/controls';
import { Icon, type IconName } from '@/components/ui/icon';
import { Sheet, SheetHeader } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { inviteLink, inviteMessage, shareInvite, type ShareChannel } from '@/lib/invite';
import { errorMessage } from '@/api/client';
import { useHousehold } from '@/state/household';
import { currentUser, householdFull, ROLE_ACCESS, ROLE_LABELS, supportingAdmin } from '@/state/selectors';
import type { Invite, Role } from '@/state/types';

const ROLES = (['admin', 'member', 'child', 'staff'] as const).map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

const CHANNELS: { channel: ShareChannel; label: string; icon: IconName }[] = [
  { channel: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { channel: 'sms', label: 'SMS', icon: 'sms' },
  { channel: 'other', label: 'More', icon: 'share' },
];

/** M13 — invite someone and share the household code (FR-02). */
export default function InviteSheet() {
  const { state, actions } = useHousehold();
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** The invite created for the current name and role (each invite has its own code). */
  const [invite, setInvite] = useState<(Invite & { for: string }) | null>(null);
  const me = currentUser(state);
  const displayName = name.trim() || 'They';
  const key = `${name.trim()}|${role}`;
  const current = invite?.for === key ? invite : null;
  // Inviting an Admin means inviting the household's one Supporting Admin.
  const supporting = supportingAdmin(state);
  const supportingInvite = state.invites.find((i) => i.role === 'admin');
  const adminTaken = role === 'admin' && !current && (supporting || supportingInvite);
  const full = householdFull(state) && !current;

  /** Reuses the invite for this name/role, or creates one on the server. */
  const ensureInvite = async () => {
    if (current) return current;
    if (full) {
      router.replace({ pathname: '/plan-limit', params: { kind: 'household_full' } });
      return null;
    }
    if (adminTaken) {
      setError(
        `${supporting?.name ?? supportingInvite?.name} is already the Supporting Admin${supporting ? '' : ' (invite pending)'}. A household can have one, so invite ${displayName === 'They' ? 'them' : displayName} as a Member, Staff or Child.`,
      );
      return null;
    }
    if (!name.trim()) {
      setError('Add their name first.');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const created = { ...(await actions.inviteMember({ name, role })), for: key };
      setInvite(created);
      return created;
    } catch (failure) {
      setError(errorMessage(failure));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const share = async (channel: ShareChannel) => {
    const ready = await ensureInvite();
    if (!ready) return;
    await shareInvite(
      inviteMessage({ name: name.trim(), householdName: state.household.name, inviterName: me.name, code: ready.code }),
      channel,
    );
  };

  const copy = async () => {
    const ready = await ensureInvite();
    if (!ready) return;
    await Clipboard.setStringAsync(inviteLink(ready.code));
    setCopied(true);
  };

  return (
    <Sheet>
      <SheetHeader title="Invite someone" />
      <TextField
        label="Their name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Chidi"
        autoCapitalize="words"
        height={50}
        bold
      />
      <View style={styles.field}>
        <Text weight="bold" size={13}>
          Role
        </Text>
        <Segmented label="Role" options={ROLES} value={role} onChange={setRole} />
      </View>

      <View style={styles.code}>
        <View style={styles.codeTop}>
          <Text weight="bold" size={12} muted style={styles.caps}>
            Invite code
          </Text>
          <Text size={12} muted>
            Expires in 7 days
          </Text>
        </View>
        <View style={styles.codeRow}>
          {current ? (
            <Text display size={28} style={styles.codeText} selectable>
              {current.code}
            </Text>
          ) : (
            <Text size={13} muted style={styles.pendingCode}>
              {busy ? 'Creating the invite…' : 'A code is created when you copy or share the invite.'}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={copy}
            style={styles.copy}>
            <Icon name={copied && current ? 'check' : 'copy'} size={14} />
            <Text weight="semibold" size={13}>
              {copied && current ? 'Copied' : 'Copy link'}
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}

      <View style={styles.channels}>
        {CHANNELS.map((option) => (
          <Pressable
            key={option.channel}
            accessibilityRole="button"
            accessibilityLabel={`Share invite by ${option.label}`}
            disabled={busy}
            onPress={() => share(option.channel)}
            style={({ pressed }) => [styles.channel, pressed && { backgroundColor: Palette.muted }]}>
            <Icon name={option.icon} size={22} />
            <Text weight="semibold" size={13}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text size={12} muted style={styles.note}>
        {role === 'admin'
          ? `${displayName === 'They' ? 'They join' : `${displayName} joins`} as the Supporting Admin: helps run the household — people, roles and settings. Someone who already runs another household can’t accept.`
          : `${displayName === 'They' ? 'They join' : `${displayName} joins`} as a ${ROLE_LABELS[role]}: ${ROLE_ACCESS[role].summary.toLowerCase()}. You can change this later.`}{' '}
        {state.plan.people} of {state.plan.peopleLimit} places used on the Free Plan.
      </Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  code: {
    backgroundColor: Palette.muted,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  codeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caps: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeText: {
    letterSpacing: 4,
  },
  pendingCode: {
    flex: 1,
    marginRight: 12,
  },
  copy: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  channels: {
    flexDirection: 'row',
    gap: 10,
  },
  channel: {
    flex: 1,
    height: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Palette.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  note: {
    lineHeight: 17,
  },
});
