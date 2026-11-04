import { SettingsContent } from '@/components/settings-content';

/** Settings for Members, Staff and Children, opened from their avatar on Home (E11, G02, C09). */
export default function PersonalSettingsScreen() {
  return <SettingsContent fallback="/home" />;
}
