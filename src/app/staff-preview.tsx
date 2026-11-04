import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreviewBanner } from '@/components/preview-banner';
import { StaffHome } from '@/components/role-homes';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { memberById } from '@/state/selectors';

/** "Preview as Grace" (design 11): what a Staff member's Home looks like. */
export default function StaffPreviewScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { state } = useHousehold();
  const insets = useSafeAreaInsets();
  const staff = memberById(state, id) ?? state.members.find((m) => m.role === 'staff');

  return (
    <View style={styles.root}>
      <PreviewBanner name={staff?.name ?? 'Staff'} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 28 + insets.bottom }]}
        showsVerticalScrollIndicator={false}>
        {staff ? <StaffHome member={staff} preview /> : <Text muted>There are no staff members in this household yet.</Text>}
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
