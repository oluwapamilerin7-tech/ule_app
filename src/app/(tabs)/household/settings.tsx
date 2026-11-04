import { SettingsContent } from '@/components/settings-content';

/** Admin settings, inside the Household tab (S11/S12). */
export default function SettingsScreen() {
  return <SettingsContent tabBar fallback="/household" />;
}
