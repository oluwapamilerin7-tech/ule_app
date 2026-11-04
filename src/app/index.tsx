import { Redirect } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ServerUnreachable } from '@/components/server-unreachable';
import { Cover } from '@/components/welcome/cover';
import { Landing } from '@/components/welcome/landing';
import { Slides } from '@/components/welcome/slides';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';

/** 0 = animated cover, 1–3 = feature slides, 4 = landing with the sign-up/sign-in actions. */
type Step = 0 | 1 | 2 | 3 | 4;

const SWIPE_DISTANCE = 50;
const COVER_DURATION = 3400;

/** Sends signed-in people straight to their household; everyone else sees the welcome flow. */
export default function IndexScreen() {
  const { status } = useHousehold();
  if (status === 'ready') return <Redirect href="/home" />;
  if (status === 'noHousehold') return <Redirect href="/create-household" />;
  if (status === 'unreachable') return <ServerUnreachable />;
  if (status === 'restoring') {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={Palette.coral} />
      </View>
    );
  }
  return <WelcomeScreen />;
}

function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  // Bumped by "Replay intro" so the cover remounts and its animations run again.
  const [playCount, setPlayCount] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (step !== 0) return;
    const timer = setTimeout(() => setStep(1), COVER_DURATION);
    return () => clearTimeout(timer);
  }, [step, playCount]);

  const go = (next: number) => setStep(Math.max(0, Math.min(4, next)) as Step);

  const onTouchStart = (event: GestureResponderEvent) => {
    touchStartX.current = event.nativeEvent.pageX;
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (touchStartX.current == null) return;
    const dx = event.nativeEvent.pageX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_DISTANCE || step === 4) return;
    if (step === 0) go(1);
    else if (dx < 0) go(step + 1);
    else if (step > 1) go(step - 1);
  };

  return (
    <View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}>
      {step === 0 ? (
        <Cover key={playCount} onStart={() => go(1)} />
      ) : step === 4 ? (
        <Landing
          onReplay={() => {
            setPlayCount((count) => count + 1);
            setStep(0);
          }}
        />
      ) : (
        <Slides step={step} onNext={() => go(step + 1)} onSkip={() => go(4)} onPick={go} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
