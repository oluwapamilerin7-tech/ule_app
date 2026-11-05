import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Api } from '@/api/endpoints';
import { StrengthMeter } from '@/components/strength-meter';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { BackButton, PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { isValidPassword } from '@/lib/auth';
import { enterApp, enterOnboarding } from '@/lib/navigation';
import { useHousehold } from '@/state/household';
import { currentUser } from '@/state/selectors';

const RESEND_AFTER = 45;

/**
 * Two ways in:
 * - Forgot password (`?email=…`): enter the 6-digit code from the email and a new password,
 * - Settings › Change password (`?from=settings`).
 */
export default function NewPasswordScreen() {
  const params = useLocalSearchParams<{ from?: string; email?: string }>();
  const { state, actions } = useHousehold();
  const fromSettings = params.from === 'settings';
  const email = params.email ?? '';
  const [code, setCode] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER);

  useEffect(() => {
    if (fromSettings || secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [fromSettings, secondsLeft]);

  const matches = confirm.length > 0 && confirm === password;
  const needsCurrent = fromSettings && state.hasPassword;
  const username = currentUser(state)?.username;
  const canSave =
    isValidPassword(password) && matches && !busy && (fromSettings ? !needsCurrent || current.length > 0 : /^\d{6}$/.test(code));

  const resend = () => {
    setSecondsLeft(RESEND_AFTER);
    setCode('');
    void Api.forgotPassword(email).catch(() => {});
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (fromSettings) {
        await Api.changePassword(password, needsCurrent ? current : undefined);
        router.back();
        return;
      }
      const where = await actions.completePasswordReset(email, code, password);
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
      <View style={styles.back}>
        <BackButton fallback={fromSettings ? '/household/settings' : '/forgot-password'} />
      </View>
      <PageTitle
        title={fromSettings ? 'Change password' : 'Set a new password'}
        subtitle={
          fromSettings
            ? `${username ? `For ${username}. ` : ''}You'll be signed out on other devices.`
            : `We sent a 6-digit code to ${email || 'your email'}. It expires in 15 minutes. You'll be signed out on other devices.`
        }
      />
      <View style={styles.form}>
        {!fromSettings ? (
          <View style={styles.codeBlock}>
            <TextField
              label="6-digit code"
              value={code}
              onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              hint="Check your spam folder if it isn't in your inbox."
            />
            <Button
              label={secondsLeft > 0 ? `Resend code in 0:${String(secondsLeft).padStart(2, '0')}` : 'Resend code'}
              variant="ghost"
              size="sm"
              disabled={secondsLeft > 0 || !email}
              onPress={resend}
            />
          </View>
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
  codeBlock: {
    gap: 4,
    alignItems: 'stretch',
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
