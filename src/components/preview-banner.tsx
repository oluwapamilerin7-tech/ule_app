import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';

/** Shown on the role previews so an admin can always get back to their own view. */
export function PreviewBanner({ name }: { name: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Icon name="eye" size={16} color={Palette.white} />
      <Text size={12} color={Palette.white} style={styles.flex}>
        Previewing as{' '}
        <Text weight="bold" size={12} color={Palette.white}>
          {name}
        </Text>
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/household'))}
        hitSlop={8}>
        <Text weight="bold" size={12} color={Palette.coral}>
          Exit preview
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.ink,
    paddingBottom: 9,
    paddingHorizontal: 20,
  },
  flex: {
    flex: 1,
  },
});
