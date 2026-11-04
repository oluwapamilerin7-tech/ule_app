import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/client';
import { StepHeader } from '@/components/step-header';
import { Button } from '@/components/ui/button';
import { InfoNote } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { PageTitle, Screen, Spacer } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';

export default function CreateHouseholdScreen() {
  const { actions } = useHousehold();
  const [householdName, setHouseholdName] = useState('');
  const [yourName, setYourName] = useState('');
  const [withRoutines, setWithRoutines] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await actions.createHousehold({ householdName, yourName, withRoutines });
      router.push('/invite-members');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen gap={20}>
      <StepHeader step={1} total={2} fallback="/sign-up" />
      <PageTitle
        title="Set up your household"
        subtitle="One shared space for everyone who helps run your home."
      />

      <View style={styles.form}>
        <TextField
          label="Household name"
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder="e.g. The Bello Household"
          autoCapitalize="words"
          autoFocus
          bold
        />
        <TextField
          label="Your name"
          value={yourName}
          onChangeText={setYourName}
          autoCapitalize="words"
          textContentType="givenName"
        />
        <View style={styles.field}>
          <Text weight="bold" size={13}>
            Time zone
          </Text>
          <View style={styles.select} accessible accessibilityLabel="Time zone, West Africa Time, Lagos">
            <Text style={styles.flex}>West Africa Time — Lagos (GMT+1)</Text>
            <Icon name="chevron-right" size={16} color={Palette.slate} style={styles.down} />
          </View>
          <Text size={12} muted>
            Used for reminders and recurring tasks.
          </Text>
        </View>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: withRoutines }}
          onPress={() => setWithRoutines((value) => !value)}
          style={styles.routines}>
          <Checkbox checked={withRoutines} />
          <View style={styles.flex}>
            <Text weight="bold">Start with common routines</Text>
            <Text size={13} muted style={styles.routinesCopy}>
              Refuse collection days, gas refill, generator servicing, school-run reminders. Edit or remove any
              of them later.
            </Text>
          </View>
        </Pressable>
      </View>

      <Spacer />
      {error ? (
        <InfoNote icon="alert" tone="alert">
          <Text size={13}>{error}</Text>
        </InfoNote>
      ) : null}
      <Button
        label={busy ? 'Setting up…' : 'Continue'}
        disabled={busy || !householdName.trim() || !yourName.trim()}
        onPress={submit}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  select: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: Palette.surface,
  },
  down: {
    transform: [{ rotate: '90deg' }],
  },
  routines: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 16,
    padding: 14,
  },
  routinesCopy: {
    lineHeight: 19,
    marginTop: 4,
  },
});
