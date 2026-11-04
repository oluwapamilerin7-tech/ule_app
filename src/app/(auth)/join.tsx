import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { Api } from '@/api/endpoints';
import type { ApiInvitePreview } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, InfoNote } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { Logo } from '@/components/ui/logo';
import { BackButton, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { enterApp } from '@/lib/navigation';
import { avatarColors } from '@/state/demo-data';
import { useHousehold } from '@/state/household';
import { currentUser, ROLE_ACCESS, ROLE_LABELS } from '@/state/selectors';

const CODE_PATTERN = /^[A-Z]+-[A-Z0-9]{3}$/;

/** Opened from an invite link (`…/join?code=BELLO-7K2`) or from "I was invited". */
export default function JoinScreen() {
  const { code: linkCode } = useLocalSearchParams<{ code?: string }>();
  const { state, status, actions } = useHousehold();
  // H03: already signed in — join with this account and stay in the current households.
  const signedIn = status === 'ready';
  const me = signedIn ? currentUser(state) : undefined;
  const [name, setName] = useState(me?.name ?? '');
  const [code, setCode] = useState((linkCode ?? '').toUpperCase());
  const [preview, setPreview] = useState<{ code: string; invite: ApiInvitePreview | null; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fromLink = !!linkCode;
  const cleanCode = code.trim().toUpperCase();

  // Look the code up as soon as it looks complete, to show whose household it is.
  useEffect(() => {
    if (!CODE_PATTERN.test(cleanCode)) return;
    let cancelled = false;
    Api.previewInvite(cleanCode)
      .then(({ invite }) => {
        if (cancelled) return;
        setPreview({ code: cleanCode, invite });
        // Suggest the name the admin typed when inviting.
        setName((typed) => typed || invite.name);
      })
      .catch((failure) => {
        if (cancelled) return;
        const message =
          failure instanceof ApiError && failure.status === 404
            ? 'That invite code is not valid or has expired. Ask for a new one.'
            : errorMessage(failure);
        setPreview({ code: cleanCode, invite: null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [cleanCode]);

  const current = preview?.code === cleanCode ? preview : null;
  const invite = current?.invite ?? null;
  const valid = name.trim().length > 0 && !!invite && !busy;

  const join = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.joinHousehold(cleanCode, name);
      enterApp();
    } catch (failure) {
      // H10: someone who already runs a household can't also be a Supporting Admin here.
      if (failure instanceof ApiError && failure.code === 'admin_limit') {
        router.push({ pathname: '/plan-limit', params: { kind: 'admin_limit', message: failure.message } });
      } else if (failure instanceof ApiError && failure.code === 'household_full') {
        setError(
          `${invite?.householdName ?? 'This household'} already has 5 people, the most on the Free Plan, so you can’t join right now. Ask them to make room first.`,
        );
      } else {
        setError(errorMessage(failure));
      }
    } finally {
      setBusy(false);
    }
  };

  const extra = invite ? invite.memberCount - invite.memberInitials.length : 0;

  return (
    <Screen gap={20}>
      <View style={styles.header}>
        <BackButton fallback="/" />
        <Logo size={22} />
        <View style={styles.spacer} />
      </View>

      {invite ? (
        <Card style={styles.invite}>
          <View style={styles.faces}>
            {invite.memberInitials.map((initials, index) => (
              <Avatar
                key={`${initials}-${index}`}
                person={{ initials, ...avatarColors(index + 1) }}
                size={48}
                style={[styles.face, index > 0 && styles.overlap]}
              />
            ))}
            {extra > 0 ? (
              <Avatar
                person={{ initials: `+${extra}`, color: Palette.divider, textColor: Palette.slate }}
                size={48}
                style={[styles.face, styles.overlap]}
              />
            ) : null}
          </View>
          <Text accessibilityRole="header" display size={24} style={styles.title}>
            {invite.invitedBy ? `${invite.invitedBy} invited you to` : "You're invited to"}
            {'\n'}
            {invite.householdName}
          </Text>
          <View style={styles.roleTag}>
            <Text weight="bold" size={12}>
              {invite.role === 'admin'
                ? 'You’ll join as the Supporting Admin'
                : invite.role === 'staff'
                  ? 'You’ll join as Staff'
                  : `You’ll join as a ${ROLE_LABELS[invite.role]}`}
            </Text>
          </View>
          <Text size={13} muted style={styles.center}>
            {`You'll see: ${ROLE_ACCESS[invite.role].sees.replace(/ · /g, ', ')}.`}
          </Text>
        </Card>
      ) : current?.error ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13}>{current.error}</Text>
        </InfoNote>
      ) : (
        <Card padded style={styles.invite}>
          <Text display size={22} style={styles.title}>
            Join a household
          </Text>
          <Text size={13} muted style={styles.center}>
            Enter the invite code from the message you were sent.
          </Text>
        </Card>
      )}

      {me ? (
        <Card style={styles.joining}>
          <Avatar person={me} size={40} />
          <View style={styles.flex}>
            <Text size={12} muted>
              Joining as
            </Text>
            <Text weight="bold">
              {me.fullName ?? me.name}
              {me.username ? (
                <Text size={13} muted>
                  {`  @${me.username} · signed in`}
                </Text>
              ) : null}
            </Text>
          </View>
        </Card>
      ) : null}
      {me ? (
        <Text size={13} muted>
          You’ll stay in {state.myHouseholds.map((h) => h.name).join(' and ')}. Switch between households from the top of
          your home screen.
        </Text>
      ) : null}

      <TextField
        label="What should the household call you?"
        value={name}
        onChangeText={setName}
        autoFocus={fromLink}
        autoCapitalize="words"
        textContentType="givenName"
        bold
      />
      <TextField
        label="Invite code"
        value={code}
        onChangeText={(value) => setCode(value.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="e.g. BELLO-7K2"
        filled={fromLink}
        editable={!fromLink}
        hint={fromLink ? 'Filled in from your invite link.' : 'Find it in the message you were sent.'}
      />

      <Spacer />

      {error ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13}>{error}</Text>
        </InfoNote>
      ) : null}

      <View style={styles.actions}>
        <Button label={busy ? 'Joining…' : 'Join household'} disabled={!valid} onPress={join} />
        {me ? (
          <Button label="Not now" variant="ghost" size="sm" onPress={() => router.back()} />
        ) : (
          <Text size={13} muted style={styles.center}>
            No password needed now. You can add one later in settings.
          </Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 44,
  },
  invite: {
    alignItems: 'center',
    gap: 10,
    padding: 20,
    borderRadius: 24,
  },
  faces: {
    flexDirection: 'row',
  },
  face: {
    borderWidth: 3,
    borderColor: Palette.surface,
  },
  overlap: {
    marginLeft: -12,
  },
  title: {
    textAlign: 'center',
    lineHeight: 29,
  },
  center: {
    textAlign: 'center',
    lineHeight: 20,
  },
  roleTag: {
    backgroundColor: Palette.divider,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  actions: {
    gap: 8,
  },
  joining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  flex: {
    flex: 1,
  },
});
