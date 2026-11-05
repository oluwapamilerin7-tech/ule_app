import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_URL } from '@/api/config';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { leaveApp } from '@/lib/navigation';
import { useHousehold } from '@/state/household';

/** Shown on launch when there's a saved sign-in but the server can't be reached. */
export function ServerUnreachable() {
  const insets = useSafeAreaInsets();
  const { actions } = useHousehold();
  return (
    <ScrollView
      style={styles.screen}
      bounces={false}
      contentContainerStyle={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 28 }]}>
      <Logo size={24} />
      <View style={styles.body}>
        <View style={styles.badge}>
          <Icon name="wifi-off" size={36} color={Palette.danger} />
        </View>
        <Text accessibilityRole="header" display size={26} style={styles.center}>
          {"Can't reach Ulé"}
        </Text>
        <Text size={15} muted style={styles.center}>
          Check your internet connection and try again.
        </Text>
        {__DEV__ ? (
          <Text size={12} muted style={styles.center}>
            Development: the app is looking for the API at {API_URL}. Make sure `npm run dev` is running in
            ule_backend, or set EXPO_PUBLIC_API_URL in ule/.env.
          </Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button label="Try again" icon="sync" onPress={() => void actions.retryConnection()} />
        <Button
          label="Sign out"
          variant="ghost"
          size="sm"
          onPress={async () => {
            await actions.signOut();
            leaveApp();
          }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  root: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    textAlign: 'center',
    lineHeight: 21,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
  },
});
