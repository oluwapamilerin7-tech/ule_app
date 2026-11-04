import { router } from 'expo-router';

/** Leaves the auth/onboarding stack for good, so Back can't return to sign-in. */
export function enterApp() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/home');
}

/** Signed in but not in a household yet: go set one up. */
export function enterOnboarding() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/create-household');
}

/** Returns to the welcome screen, clearing everything above it. */
export function leaveApp() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
}
