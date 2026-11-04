import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError, errorMessage, isNetworkError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/controls';
import { BackButton, PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { enterApp, enterOnboarding } from '@/lib/navigation';
import { useHousehold } from '@/state/household';

type SignInError =
  | { kind: 'password'; attemptsLeft?: number }
  | { kind: 'locked'; message: string }
  | { kind: 'offline' }
  | { kind: 'other'; message: string };

export default function SignInScreen() {
  const { actions } = useHousehold();
  // The seeded demo account is filled in during development so the flow is one tap.
  const [username, setUsername] = useState(__DEV__ ? 'deborah.bello' : '');
  const [password, setPassword] = useState(__DEV__ ? 'homesweet26' : '');
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [error, setError] = useState<SignInError | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const where = await actions.signIn(username, password);
      await actions.updatePreferences({ keepSignedIn });
      if (where === 'noHousehold') enterOnboarding();
      else enterApp();
    } catch (failure) {
      if (isNetworkError(failure)) setError({ kind: 'offline' });
      else if (failure instanceof ApiError && failure.status === 423) setError({ kind: 'locked', message: failure.message });
      else if (failure instanceof ApiError && failure.status === 401) {
        setError({ kind: 'password', attemptsLeft: failure.details?.attemptsLeft });
      } else setError({ kind: 'other', message: errorMessage(failure) });
    } finally {
      setBusy(false);
    }
  };

  const passwordError = error?.kind === 'password' || error?.kind === 'locked';

  return (
    <Screen gap={22}>
      <View style={styles.back}>
        <BackButton fallback="/" />
      </View>
      <PageTitle title="Welcome back" subtitle="Sign in to see what needs your attention today." />

      {error?.kind === 'password' ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13} style={styles.noteText}>
            <Text weight="bold" size={13}>
              {"That username and password don't match."}
            </Text>
            {error.attemptsLeft !== undefined
              ? ` ${error.attemptsLeft} ${error.attemptsLeft === 1 ? 'try' : 'tries'} left before we pause sign-in for 15 minutes.`
              : ''}
          </Text>
        </InfoNote>
      ) : null}
      {error?.kind === 'locked' || error?.kind === 'other' ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13} style={styles.noteText}>
            {error.message}
          </Text>
        </InfoNote>
      ) : null}

      <View style={styles.form}>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="current-password"
          textContentType="password"
          error={passwordError ? 'Check the password and try again.' : undefined}
          onSubmitEditing={submit}
          labelRight={
            <Pressable accessibilityRole="link" onPress={() => router.push('/forgot-password')} hitSlop={8}>
              <Text weight={passwordError ? 'bold' : 'semibold'} size={13} muted={!passwordError}>
                Forgot password?
              </Text>
            </Pressable>
          }
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: keepSignedIn }}
          onPress={() => setKeepSignedIn((value) => !value)}
          style={styles.check}>
          <Checkbox checked={keepSignedIn} size={20} />
          <Text size={14}>Keep me signed in on this phone</Text>
        </Pressable>
      </View>

      <Spacer />

      <InfoNote icon="share">
        <Text size={13} style={styles.noteText}>
          Joining through an invite? Open the link you were sent — no sign-up needed.{' '}
          <Text weight="bold" size={13} accessibilityRole="link" onPress={() => router.push('/join')} style={styles.link}>
            Use invite
          </Text>
        </Text>
      </InfoNote>

      {error?.kind === 'offline' ? (
        <InfoNote icon="wifi-off" tone="dark">
          <View style={styles.offline}>
            <Text size={13} color={Palette.white} style={styles.flex}>
              No connection. Sign-in needs internet once.
            </Text>
            <Pressable accessibilityRole="button" onPress={submit} hitSlop={8}>
              <Text weight="bold" size={13} color={Palette.white}>
                Retry
              </Text>
            </Pressable>
          </View>
        </InfoNote>
      ) : null}

      <View style={styles.actions}>
        <Button
          label={busy ? 'Signing in…' : 'Sign in'}
          onPress={submit}
          disabled={busy || error?.kind === 'locked' || !username || !password}
        />
        <View style={styles.inline}>
          <Text size={14} muted>
            New to Ulé?{' '}
          </Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-up')} hitSlop={8}>
            <Text weight="bold" size={14}>
              Create an account
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'flex-start',
  },
  form: {
    gap: 16,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    lineHeight: 19,
  },
  link: {
    textDecorationLine: 'underline',
  },
  flex: {
    flex: 1,
  },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actions: {
    gap: 8,
  },
  inline: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
