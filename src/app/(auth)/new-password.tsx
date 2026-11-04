import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Api } from '@/api/endpoints';
import { StrengthMeter } from '@/components/strength-meter';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { BackButton, PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { isValidPassword } from '@/lib/auth';
import { enterApp, enterOnboarding } from '@/lib/navigation';
import { useHousehold } from '@/state/household';
import { currentUser } from '@/state/selectors';

/** Pulls the reset token out of a pasted link ("…new-password?token=abc") or takes it as-is. */
function tokenFrom(input: string) {
  const match = /[?&]token=([^&\s]+)/.exec(input);
  return decodeURIComponent(match ? match[1] : input.trim());
}

/**
 * Three ways in:
 * - the reset email's link (`/new-password?token=…`),
 * - "I have the link" after asking for one (paste the link),
 * - Settings › Change password (`?from=settings`).
 */
export default function NewPasswordScreen() {
  const params = useLocalSearchParams<{ from?: string; token?: string }>();
  const { state, actions } = useHousehold();
  const fromSettings = params.from === 'settings';
  const [pasted, setPasted] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = confirm.length > 0 && confirm === password;
  const token = params.token ?? (pasted ? tokenFrom(pasted) : '');
  const needsCurrent = fromSettings && state.hasPassword;
  const username = currentUser(state)?.username;
  const canSave =
    isValidPassword(password) && matches && !busy && (fromSettings ? !needsCurrent || current.length > 0 : token.length >= 20);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (fromSettings) {
        await Api.changePassword(password, needsCurrent ? current : undefined);
        router.back();
        return;
      }
      const where = await actions.completePasswordReset(token, password);
      if (where === 'noHousehold') enterOnboarding();
      else enterApp();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen gap={22}>
      {fromSettings ? (
        <View style={styles.back}>
          <BackButton fallback="/household/settings" />
        </View>
      ) : (
        <View style={styles.logo}>
          <Logo size={22} />
        </View>
      )}
      <PageTitle
        title={fromSettings ? 'Change password' : 'Set a new password'}
        subtitle={`${username ? `For ${username}. ` : ''}You'll be signed out on other devices.`}
      />
      <View style={styles.form}>
        {!fromSettings && !params.token ? (
          <TextField
            label="Reset link from the email"
            value={pasted}
            onChangeText={setPasted}
            placeholder="Paste the link or code"
            autoCapitalize="none"
            autoCorrect={false}
            hint="Copy the link from the email and paste it here."
          />
        ) : null}
        {needsCurrent ? (
          <TextField
            label="Current password"
            value={current}
            onChangeText={setCurrent}
            password
            autoComplete="current-password"
            textContentType="password"
          />
        ) : null}
        <TextField
          label="New password"
          value={password}
          onChangeText={setPassword}
          password
          autoFocus={!!params.token}
          autoComplete="new-password"
          textContentType="newPassword"
          hint={
            <View style={styles.hint}>
              <StrengthMeter password={password} />
              <Text size={12} muted>
                At least 8 characters, with a number.
              </Text>
            </View>
          }
        />
        <TextField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          error={confirm.length > 0 && !matches ? "Passwords don't match." : undefined}
          hint={
            matches ? (
              <View style={styles.match}>
                <Icon name="check" size={14} />
                <Text size={12}>Passwords match</Text>
              </View>
            ) : null
          }
        />
      </View>
      <Spacer />
      {error ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13}>{error}</Text>
        </InfoNote>
      ) : null}
      <Button
        label={busy ? 'Saving…' : fromSettings ? 'Save password' : 'Save and sign in'}
        disabled={!canSave}
        onPress={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'flex-start',
  },
  logo: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: 16,
  },
  hint: {
    gap: 6,
  },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
