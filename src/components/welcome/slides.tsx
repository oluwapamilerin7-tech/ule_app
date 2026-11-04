import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Logo } from '@/components/ui/logo';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { addDays, isSameDay, startOfWeek, weekdayLetter } from '@/lib/dates';

import {
  dropIn,
  EASE_IN_OUT,
  EASE_OUT,
  fadeUp,
  Float,
  pop,
  PulseDot,
  slideIn,
  StrikeText,
  wiggle,
} from './motion';

const COPY = [
  {
    title: "Everyone knows\nwhat's theirs.",
    body: "Assign chores and routines to the right person. Ulé keeps track, so you don't have to.",
  },
  {
    title: 'Reminders do\nthe reminding.',
    body: 'School events, chores and routines nudge the right person at the right time, with quiet hours built in.',
  },
  {
    title: 'Know before\nit runs out.',
    body: 'Mark gas, rice or diesel as low and it lands on the shared shopping list for whoever goes to the market.',
  },
];

const T = { initials: 'T', color: Palette.slate, textColor: Palette.white };
const G = { initials: 'G', color: Palette.grey, textColor: Palette.ink };
const D = { initials: 'D', color: Palette.coral, textColor: Palette.ink };

type SlidesProps = {
  step: 1 | 2 | 3;
  onNext: () => void;
  onSkip: () => void;
  onPick: (step: number) => void;
};

export function Slides({ step, onNext, onSkip, onPick }: SlidesProps) {
  const copy = COPY[step - 1];
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Logo size={24} />
        <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={8} style={styles.skip}>
          <Text weight="semibold" size={14} muted>
            Skip
          </Text>
        </Pressable>
      </View>

      <View key={`art-${step}`} style={styles.art}>
        {step === 1 ? <TasksArt /> : step === 2 ? <RemindersArt /> : <StockArt />}
      </View>

      <View key={`copy-${step}`} style={styles.copy}>
        <Animated.View entering={fadeUp(150)}>
          <Text accessibilityRole="header" display size={30} style={styles.title}>
            {copy.title}
          </Text>
        </Animated.View>
        <Animated.View entering={fadeUp(300)}>
          <Text size={15} muted style={styles.body}>
            {copy.body}
          </Text>
        </Animated.View>
      </View>

      <View style={styles.spacer} />

      <View style={styles.dots}>
        {[1, 2, 3].map((i) => (
          <Dot key={i} active={i === step} label={`Go to slide ${i}`} onPress={() => onPick(i)} />
        ))}
      </View>

      <View style={styles.actions}>
        <Button label="Continue" trailingIcon="arrow-right" onPress={onNext} style={styles.continue} />
        <View style={styles.signIn}>
          <Text size={14} muted>
            Already have an account?{' '}
          </Text>
          <Pressable accessibilityRole="link" onPress={() => router.push('/sign-in')} hitSlop={8}>
            <Text weight="bold" size={14}>
              Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Dot({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(active ? 28 : 8, { duration: 450, easing: EASE_OUT }),
    backgroundColor: withTiming(active ? Palette.ink : Palette.line, { duration: 450 }),
  }));
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.dotHit}>
      <Animated.View style={[styles.dot, style]} />
    </Pressable>
  );
}

type ArtProps = { children: ReactNode; delay: number; style?: StyleProp<ViewStyle> };

function Row({ children, delay, style }: ArtProps) {
  return (
    <Animated.View entering={slideIn(delay)} style={[styles.row, style]}>
      {children}
    </Animated.View>
  );
}

function Toast({ children, delay, style }: ArtProps) {
  return (
    <Animated.View entering={pop(delay)} style={[styles.toast, style]}>
      {children}
    </Animated.View>
  );
}

function TasksArt() {
  return (
    <>
      <Animated.View entering={fadeUp(0)} style={[styles.card, styles.cardList]}>
        <View style={styles.cardHead}>
          <Text weight="bold">Today</Text>
          <Text size={12} muted>
            The Bello Household
          </Text>
        </View>
        <Row delay={250}>
          <View style={styles.ring}>
            <Animated.View entering={pop(1300)} style={styles.ringDone}>
              <Icon name="check" size={14} />
            </Animated.View>
          </View>
          <View style={styles.flex}>
            <StrikeText delay={1500}>Refill cooking gas</StrikeText>
            <Text size={12} color={Palette.slateDeep}>
              Tunde · Monthly
            </Text>
          </View>
          <Avatar person={T} />
        </Row>
        <Row delay={400}>
          <View style={styles.ring} />
          <View style={styles.flex}>
            <Text weight="semibold">Sweep & mop downstairs</Text>
            <Text size={12} color={Palette.slateDeep}>
              Grace · Daily
            </Text>
          </View>
          <Avatar person={G} />
        </Row>
        <Row delay={550}>
          <View style={styles.ring} />
          <View style={styles.flex}>
            <Text weight="semibold">{"Check Ayo's homework"}</Text>
            <Text size={12} color={Palette.slateDeep}>
              You · Weekdays
            </Text>
          </View>
          <Avatar person={D} />
        </Row>
      </Animated.View>
      <Toast delay={1900} style={styles.toastCorner}>
        <Icon name="check" size={16} color={Palette.coral} />
        <Text weight="semibold" size={13} color={Palette.white}>
          Tunde finished a task
        </Text>
      </Toast>
    </>
  );
}

function RemindersArt() {
  const today = new Date();
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(today), i));
  return (
    <View style={styles.stack}>
      <Animated.View entering={dropIn(0)} style={[styles.card, styles.notification]}>
        <Animated.View entering={wiggle(800)} style={styles.bell}>
          <Icon name="bell" size={20} color={Palette.danger} />
        </Animated.View>
        <View style={styles.flex}>
          <Text weight="semibold" size={12} muted>
            Ulé · now
          </Text>
          <Text weight="bold">PTA meeting at 10:00</Text>
          <Text size={12} muted>
            Reminder for Deborah and Tunde
          </Text>
        </View>
      </Animated.View>
      <Animated.View entering={fadeUp(900)} style={[styles.card, styles.week]}>
        {week.map((day) => {
          const active = isSameDay(day, today);
          return (
            <View key={day.toISOString()} style={[styles.weekDay, active && styles.weekDayActive]}>
              <Text weight="semibold" size={11} color={active ? Palette.line : Palette.slate}>
                {weekdayLetter(day)}
              </Text>
              <Text weight="bold" color={active ? Palette.white : Palette.ink}>
                {day.getDate()}
              </Text>
              {active ? <PulseDot /> : null}
            </View>
          );
        })}
      </Animated.View>
      <Row delay={1100} style={styles.eventRow}>
        <View style={[styles.bar, { backgroundColor: Palette.slate }]} />
        <View>
          <Text weight="semibold">Generator servicing</Text>
          <Text size={12} color={Palette.slateDeep}>
            2:00pm · Every 3 months
          </Text>
        </View>
      </Row>
      <Row delay={1250} style={styles.eventRow}>
        <View style={[styles.bar, { backgroundColor: Palette.coral }]} />
        <View>
          <Text weight="semibold">Refuse collection</Text>
          <Text size={12} color={Palette.slateDeep}>
            Tue 7:00am · Tue & Fri
          </Text>
        </View>
      </Row>
    </View>
  );
}

function StockArt() {
  const deplete = useSharedValue(0);
  const swap = useSharedValue(0);
  useEffect(() => {
    deplete.set(withDelay(300, withTiming(1, { duration: 1600, easing: EASE_IN_OUT })));
    swap.set(withDelay(1300, withTiming(1, { duration: 350 })));
  }, [deplete, swap]);
  const barStyle = useAnimatedStyle(() => ({
    width: `${74 - 58 * deplete.get()}%`,
    backgroundColor: interpolateColor(deplete.get(), [0, 1], [Palette.slate, Palette.coral]),
  }));
  const availableStyle = useAnimatedStyle(() => ({
    opacity: 1 - swap.get(),
    transform: [{ translateY: -6 * swap.get() }],
  }));

  return (
    <View style={styles.stack}>
      <Animated.View entering={fadeUp(0)} style={[styles.card, styles.gasCard]}>
        <View style={styles.cardHead}>
          <View>
            <Text weight="bold" size={16}>
              Cooking gas
            </Text>
            <Text size={12} muted>
              12.5kg cylinder
            </Text>
          </View>
          <View style={styles.statusSlot}>
            <Animated.View style={[styles.status, styles.statusAvailable, availableStyle]}>
              <Text weight="bold" size={12}>
                Available
              </Text>
            </Animated.View>
            <Animated.View entering={pop(1500)} style={[styles.status, styles.statusLow]}>
              <Text weight="bold" size={12}>
                Low
              </Text>
            </Animated.View>
          </View>
        </View>
        <View style={styles.meter}>
          <Animated.View style={[styles.meterFill, barStyle]} />
        </View>
      </Animated.View>
      <Row delay={500} style={styles.stockRow}>
        <Text weight="semibold">Diesel (generator)</Text>
        <View style={[styles.pill, { backgroundColor: Palette.ink }]}>
          <Text weight="bold" size={12} color={Palette.white}>
            Out
          </Text>
        </View>
      </Row>
      <Row delay={650} style={styles.stockRow}>
        <Text weight="semibold">Drinking water</Text>
        <View style={[styles.pill, { backgroundColor: Palette.surface }]}>
          <Text weight="bold" size={12}>
            Available
          </Text>
        </View>
      </Row>
      <Toast delay={2100} style={styles.toastCenter}>
        <Float>
          <Icon name="cart" size={18} color={Palette.coral} />
        </Float>
        <Text weight="semibold" size={13} color={Palette.white}>
          Gas added to the shopping list
        </Text>
      </Toast>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  flex: {
    flex: 1,
  },
  header: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skip: {
    height: 40,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  art: {
    height: 340,
    marginTop: 28,
  },
  copy: {
    gap: 10,
    marginTop: 32,
  },
  title: {
    lineHeight: 33,
    letterSpacing: -0.8,
  },
  body: {
    lineHeight: 22,
  },
  spacer: {
    flex: 1,
    minHeight: 12,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 2,
    marginBottom: 12,
  },
  dotHit: {
    height: 32,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    gap: 10,
  },
  continue: {
    height: 56,
    borderRadius: 28,
  },
  signIn: {
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    boxShadow: '0 18px 40px rgba(47,47,47,0.08)',
  },
  cardList: {
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Palette.mist,
    borderRadius: 14,
    padding: 12,
  },
  ring: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Palette.grey,
  },
  ringDone: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.ink,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    boxShadow: '0 12px 24px rgba(47,47,47,0.2)',
  },
  toastCorner: {
    position: 'absolute',
    right: 8,
    bottom: 34,
  },
  toastCenter: {
    alignSelf: 'center',
    marginTop: 6,
    borderRadius: 22,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  stack: {
    gap: 14,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 14,
    boxShadow: '0 18px 40px rgba(47,47,47,0.10)',
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Palette.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  week: {
    flexDirection: 'row',
    gap: 2,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    boxShadow: 'none',
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weekDayActive: {
    backgroundColor: Palette.ink,
  },
  eventRow: {
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  bar: {
    width: 4,
    height: 32,
    borderRadius: 2,
  },
  gasCard: {
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  statusSlot: {
    width: 84,
    height: 28,
  },
  status: {
    position: 'absolute',
    right: 0,
    top: 0,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  statusAvailable: {
    backgroundColor: Palette.mist,
  },
  statusLow: {
    backgroundColor: Palette.coral,
    paddingHorizontal: 12,
  },
  meter: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.mist,
    overflow: 'hidden',
  },
  meterFill: {
    height: 10,
    borderRadius: 5,
  },
  stockRow: {
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
});
