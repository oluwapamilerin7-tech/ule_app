import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreviewBanner } from '@/components/preview-banner';
import { ChildHome } from '@/components/role-homes';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

/** "Preview as Ayo" (design 12): what a child's Home looks like. */
export default function ChildPreviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useHousehold();
  const insets = useSafeAreaInsets();
  const child = memberById(state, id) ?? state.members.find((m) => m.role === 'child');

  return (
    <View style={styles.root}>
      <PreviewBanner name={child?.name ?? 'Child'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {child ? <ChildHome member={child} preview /> : <Text muted>There are no children in this household yet.</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
});
