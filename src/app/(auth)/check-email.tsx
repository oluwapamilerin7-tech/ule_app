import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Api } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { BackButton, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';

const RESEND_AFTER = 45;

export default function CheckEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [secondsLeft, setSecondsLeft] = useState(RESEND_AFTER);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`;

  return (
    <Screen gap={22}>
      <View style={styles.back}>
        <BackButton fallback="/forgot-password" />
      </View>

      <View style={styles.hero}>
        <View style={styles.badge}>
          <Icon name="mail" size={40} color={Palette.danger} />
        </View>
        <Text accessibilityRole="header" display size={28} style={styles.title}>
          Check your email
        </Text>
        <Text size={15} muted style={styles.center}>
          We sent a password reset link to{'\n'}
          <Text weight="bold" size={15}>
            {email || 'your email'}
          </Text>
        </Text>
        <Text size={13} muted style={styles.center}>
          The link works once and expires in 30 minutes. Check your spam folder if it isn&apos;t there.
        </Text>
      </View>

      <Spacer />

      <View style={styles.actions}>
        {/* Tapping the emailed link opens /new-password?token=… directly; this is for pasting it. */}
        <Button label="I have the link" icon="mail" onPress={() => router.push('/new-password')} />
        <Button
          label={secondsLeft > 0 ? `Resend link in ${countdown}` : 'Resend link'}
          variant="subtle"
          size="md"
          disabled={secondsLeft > 0}
          onPress={() => {
            setSecondsLeft(RESEND_AFTER);
            if (email) void Api.forgotPassword(email).catch(() => {});
          }}
        />
        <Button label="Use a different email" variant="ghost" size="sm" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignItems: 'flex-start',
  },
  hero: {
    alignItems: 'center',
    gap: 14,
    paddingTop: 40,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Palette.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.5,
  },
  center: {
    textAlign: 'center',
    lineHeight: 21,
  },
  actions: {
    gap: 10,
  },
});
