import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

export function inviteLink(code: string) {
  return Linking.createURL('/join', { queryParams: { code } });
}

export function inviteMessage(input: { name: string; householdName: string; inviterName: string; code: string }) {
  return (
    `Hi ${input.name}, ${input.inviterName} invited you to ${input.householdName} on Ulé.\n` +
    `Open this link to join: ${inviteLink(input.code)}\n` +
    `Or enter the code ${input.code}.`
  );
}

export type ShareChannel = 'whatsapp' | 'sms' | 'other';

/**
 * Opens WhatsApp or the SMS composer with the message, falling back to the system share
 * sheet when that app isn't available. Resolves to whether something was opened.
 */
export async function shareInvite(message: string, channel: ShareChannel = 'other') {
  const encoded = encodeURIComponent(message);
  try {
    if (channel === 'whatsapp') {
      const url = `whatsapp://send?text=${encoded}`;
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return true;
      }
    } else if (channel === 'sms') {
      // iOS reads the body after "&", Android after "?".
      await Linking.openURL(Platform.OS === 'ios' ? `sms:&body=${encoded}` : `sms:?body=${encoded}`);
      return true;
    }
    const result = await Share.share({ message });
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
