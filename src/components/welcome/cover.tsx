import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { FontFamily, Palette } from '@/constants/theme';

import { bloom, EASE_IN_OUT, EASE_OUT, fade, fadeUp, growX, rise } from './motion';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** Roof + walls outline length, so the stroke can "draw" itself in. */
const HOUSE_PATH_LENGTH = 200;

function HouseMark() {
  const draw = useSharedValue(0);
  const door = useSharedValue(0);
  useEffect(() => {
    draw.set(withTiming(1, { duration: 1100, easing: EASE_IN_OUT }));
    door.set(withDelay(1000, withTiming(1, { duration: 800 })));
  }, [draw, door]);
  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: HOUSE_PATH_LENGTH * (1 - draw.get()),
  }));
  const doorProps = useAnimatedProps(() => ({ opacity: door.get() }));
  return (
    <Svg width={72} height={63} viewBox="0 0 80 70" aria-hidden>
      <AnimatedPath
        d="M8 34 40 9l32 25M16 28v34h48V28"
        fill="none"
        stroke={Palette.ink}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={[HOUSE_PATH_LENGTH, HOUSE_PATH_LENGTH]}
        animatedProps={pathProps}
      />
      <AnimatedRect x="34" y="44" width="12" height="18" rx="2" fill={Palette.coral} animatedProps={doorProps} />
    </Svg>
  );
}

const LETTERS = [
  { char: 'U', delay: 550 },
  { char: 'l', delay: 680 },
  { char: 'é', delay: 810, accent: true },
];

export function Cover({ onStart }: { onStart: () => void }) {
  const breathe = useSharedValue(1);
  const ripple = useSharedValue(0);
  const rippleVisible = useSharedValue(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    breathe.set(
      withDelay(
        1400,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      ),
    );
    rippleVisible.set(withDelay(1200, withTiming(1, { duration: 1 })));
    ripple.set(withDelay(1200, withRepeat(withTiming(1, { duration: 2400, easing: EASE_OUT }), -1)));
    progress.set(withTiming(1, { duration: 3000, easing: Easing.linear }));
  }, [breathe, ripple, rippleVisible, progress]);

  const breatheStyle = useAnimatedStyle(() => ({ transform: [{ scale: breathe.get() }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: rippleVisible.get() * 0.55 * (1 - ripple.get()),
    transform: [{ scale: 0.7 + ripple.get() * 0.8 }],
  }));
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View style={styles.root}>
      <View style={styles.center}>
        <Animated.View style={[styles.circle, breatheStyle]}>
          <Animated.View entering={bloom()} style={[styles.fill, styles.bloom]} />
        </Animated.View>
        <Animated.View style={[styles.circle, styles.ripple, rippleStyle]} />

        <View style={styles.mark} accessible accessibilityLabel="Ulé. Your mobile butler">
          <HouseMark />
          <View style={styles.word}>
            {LETTERS.map((letter, index) => (
              <View key={letter.char} style={[styles.mask, index > 0 && { marginLeft: -4 }]}>
                <Animated.Text
                  entering={rise(letter.delay)}
                  style={[styles.letter, letter.accent && { color: Palette.coral }]}>
                  {letter.char}
                </Animated.Text>
              </View>
            ))}
          </View>
          <Animated.View entering={growX(1300)} style={styles.underline} />
          <Animated.View entering={fadeUp(1500)}>
            <Text weight="semibold" size={13} muted style={styles.tagline}>
              Your mobile butler
            </Text>
          </Animated.View>
        </View>
      </View>

      <Animated.View entering={fade(1800)} style={styles.bottom}>
        <Pressable
          accessibilityRole="button"
          onPress={onStart}
          style={({ pressed }) => [styles.begin, pressed && { opacity: 0.7 }]}>
          <Text weight="semibold" size={14}>
            Tap to begin
          </Text>
          <Icon name="arrow-right" size={16} />
        </Pressable>
        <View style={styles.track}>
          <Animated.View style={[styles.trackFill, progressStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  fill: {
    flex: 1,
    borderRadius: 150,
  },
  bloom: {
    backgroundColor: Palette.coralTint,
  },
  ripple: {
    borderWidth: 1.5,
    borderColor: Palette.coralLine,
  },
  mark: {
    alignItems: 'center',
    gap: 6,
  },
  word: {
    flexDirection: 'row',
  },
  mask: {
    overflow: 'hidden',
    paddingHorizontal: 2,
    paddingBottom: 10,
  },
  letter: {
    fontFamily: FontFamily.displayHeavy,
    fontSize: 112,
    lineHeight: 124,
    letterSpacing: -5,
    color: Palette.ink,
  },
  underline: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.ink,
  },
  tagline: {
    marginTop: 14,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  bottom: {
    alignItems: 'center',
    gap: 16,
    paddingBottom: 44,
  },
  begin: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    width: 96,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.mist,
    overflow: 'hidden',
  },
  trackFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.coral,
  },
});
