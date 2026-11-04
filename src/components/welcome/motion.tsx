import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInRight,
  FadeInUp,
  interpolateColor,
  Keyframe,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { FontFamily, Palette } from '@/constants/theme';

/**
 * Motion presets matching the CSS keyframes in the design's animated intro.
 * Keyframe instances are mutable, so each helper builds a fresh one.
 */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
const EASE_BACK = Easing.bezier(0.34, 1.56, 0.64, 1);

export const fade = (delay = 0) => FadeIn.delay(delay).duration(800);
export const fadeUp = (delay = 0) => FadeInUp.delay(delay).duration(700).easing(EASE_OUT);
export const slideIn = (delay = 0) => FadeInRight.delay(delay).duration(700).easing(EASE_OUT);

export const pop = (delay = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.4 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_BACK },
  })
    .delay(delay)
    .duration(500);

export const rise = (delay = 0) =>
  new Keyframe({
    0: { transform: [{ translateY: 130 }] },
    100: { transform: [{ translateY: 0 }], easing: EASE_OUT },
  })
    .delay(delay)
    .duration(950);

export const bloom = (delay = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.3 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
  })
    .delay(delay)
    .duration(1400);

export const growX = (delay = 0) =>
  new Keyframe({
    0: { transform: [{ scaleX: 0 }] },
    100: { transform: [{ scaleX: 1 }], easing: EASE_OUT },
  })
    .delay(delay)
    .duration(800);

export const dropIn = (delay = 0) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: -48 }, { scale: 0.96 }] },
    60: { opacity: 1, transform: [{ translateY: 6 }, { scale: 1 }], easing: EASE_OUT },
    100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: EASE_OUT },
  })
    .delay(delay)
    .duration(800);

export const wiggle = (delay = 0) =>
  new Keyframe({
    0: { transform: [{ rotate: '0deg' }] },
    20: { transform: [{ rotate: '-16deg' }] },
    40: { transform: [{ rotate: '12deg' }] },
    60: { transform: [{ rotate: '-8deg' }] },
    80: { transform: [{ rotate: '4deg' }] },
    100: { transform: [{ rotate: '0deg' }] },
  })
    .delay(delay)
    .duration(900);

/** Text that gets struck through and greyed out, like a task being ticked off. */
export function StrikeText({ children, delay }: { children: string; delay: number }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withDelay(delay, withTiming(1, { duration: 500 })));
  }, [progress, delay]);
  const lineStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [Palette.ink, Palette.slate]),
  }));
  return (
    <View style={styles.strikeWrap}>
      <Animated.Text style={[styles.strikeText, textStyle]}>{children}</Animated.Text>
      <Animated.View style={[styles.strikeLine, lineStyle]} />
    </View>
  );
}

/** Coral dot with a soft pulsing halo. */
export function PulseDot() {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1));
  }, [pulse]);
  const halo = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - pulse.get()),
    transform: [{ scale: 1 + pulse.get() * 2.4 }],
  }));
  return (
    <View style={styles.pulse}>
      <Animated.View style={[styles.pulseHalo, halo]} />
      <View style={styles.pulseDot} />
    </View>
  );
}

/** Gently bobbing wrapper (the floating cart icon). */
export function Float({ children }: { children: ReactNode }) {
  const bob = useSharedValue(0);
  useEffect(() => {
    bob.set(withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [bob]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: -6 * bob.get() }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  strikeWrap: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  strikeText: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
  },
  strikeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '58%',
    height: 1.5,
    backgroundColor: Palette.slate,
    transformOrigin: 'left',
  },
  pulse: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseHalo: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.coral,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.coral,
  },
});
