import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { Api } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { BackButton, PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { isValidEmail } from '@/lib/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await Api.forgotPassword(email.trim());
      router.push({ pathname: '/new-password', params: { email: email.trim() } });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen gap={22}>
      <View style={styles.back}>
        <BackButton fallback="/sign-in" />
      </View>
      <PageTitle
        title="Forgot your password?"
        subtitle="Enter the email on your account and we'll send you a 6-digit code to reset your password."
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoFocus
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <InfoNote icon="alert">
        <Text size={13} style={styles.noteText}>
          {"Can't get into that email? Ask a household admin to reset your password from "}
          <Text weight="bold" size={13}>
            Settings › People & roles
          </Text>
          .
        </Text>
      </InfoNote>
      <Spacer />
      {error ? (
        <Text size={13} color={Palette.danger}>
          {error}
        </Text>
      ) : null}
      <Button label={busy ? 'Sending…' : 'Send code'} disabled={busy || !isValidEmail(email)} onPress={send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'flex-start',
  },
  noteText: {
    lineHeight: 19,
  },
});
