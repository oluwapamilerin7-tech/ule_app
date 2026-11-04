import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ApiError, errorMessage } from '@/api/client';
import { Api } from '@/api/endpoints';
import { StrengthMeter } from '@/components/strength-meter';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { BackButton, PageTitle, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { isValidEmail, isValidPassword, isValidUsername } from '@/lib/auth';
import { useHousehold } from '@/state/household';

export default function SignUpScreen() {
  const { actions } = useHousehold();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  /** Result of the server's availability check, for the username it was run on. */
  const [availability, setAvailability] = useState<{ username: string; available: boolean } | null>(null);

  // Ask the server whether the username is free, shortly after typing stops.
  useEffect(() => {
    const candidate = username.trim().toLowerCase();
    if (!isValidUsername(candidate)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      Api.usernameAvailable(candidate)
        .then((res) => {
          if (!cancelled) setAvailability({ username: candidate, available: res.available });
        })
        .catch(() => {});
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const checked = availability?.username === username.trim().toLowerCase() ? availability : null;
  const taken = checked?.available === false;
  const usernameOk = isValidUsername(username) && !taken;
  const confirmError = confirm.length > 0 && confirm !== password ? "Passwords don't match." : undefined;
  const canSubmit =
    usernameOk && isValidEmail(email) && isValidPassword(password) && confirm === password && agreed && !busy;

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await actions.register({
        username: username.trim().toLowerCase(),
        email: email.trim(),
        password,
        fullName: username.trim(),
      });
      router.replace('/create-household');
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.details?.fields
          ? Object.values(error.details.fields).join(' ')
          : errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  };

  const usernameHint = !username ? (
    'Letters, numbers, dots and underscores.'
  ) : taken ? (
    <Text size={12} weight="semibold" color={Palette.danger}>
      That username is taken.
    </Text>
  ) : isValidUsername(username) && checked?.available ? (
    <View style={styles.hintRow}>
      <Icon name="check" size={14} color={Palette.slate} />
      <Text size={12} muted>
        Username is available
      </Text>
    </View>
  ) : isValidUsername(username) ? (
    'Checking…'
  ) : (
    'At least 3 characters: letters, numbers, dots and underscores.'
  );

  return (
    <Screen gap={14} contentStyle={styles.content}>
      <View style={styles.back}>
        <BackButton fallback="/" />
      </View>
      <PageTitle title="Create your account" subtitle="Next, you'll set up your household." />

      <View style={styles.form}>
        <TextField
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username-new"
          textContentType="username"
          hint={usernameHint}
        />
        <TextField
          label="Email"
          labelNote="(for password reset)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          hint={
            <View style={styles.passwordHint}>
              <StrengthMeter password={password} />
              <Text size={12} muted>
                At least 8 characters, with a number.
              </Text>
            </View>
          }
        />
        <TextField
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          password
          autoComplete="new-password"
          textContentType="newPassword"
          error={confirmError}
        />
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
          onPress={() => setAgreed((value) => !value)}
          style={styles.agree}>
          <Checkbox checked={agreed} size={20} />
          <Text size={13} muted style={styles.agreeText}>
            I agree to the{' '}
            <Text weight="semibold" size={13}>
              Terms
            </Text>{' '}
            and{' '}
            <Text weight="semibold" size={13}>
              Privacy Policy
            </Text>
            .
          </Text>
        </Pressable>
      </View>

      <InfoNote icon="share">
        <Text size={13} style={styles.noteText}>
          Were you invited? You don&apos;t need to sign up — just open your invite link.{' '}
          <Text weight="bold" size={13} accessibilityRole="link" onPress={() => router.push('/join')} style={styles.link}>
            Use invite
          </Text>
        </Text>
      </InfoNote>

      {formError ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13}>{formError}</Text>
        </InfoNote>
      ) : null}

      <View style={styles.actions}>
        <Button label={busy ? 'Creating…' : 'Create account'} disabled={!canSubmit} onPress={submit} />
        <View style={styles.inline}>
          <Text size={14} muted>
            Already have an account?{' '}
          </Text>
          <Pressable accessibilityRole="link" onPress={() => router.replace('/sign-in')} hitSlop={8}>
            <Text weight="bold" size={14}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
  },
  back: {
    alignItems: 'flex-start',
  },
  form: {
    gap: 12,
    flexGrow: 1,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  passwordHint: {
    gap: 6,
  },
  agree: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  agreeText: {
    flex: 1,
    lineHeight: 19,
  },
  noteText: {
    lineHeight: 19,
  },
  link: {
    textDecorationLine: 'underline',
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
