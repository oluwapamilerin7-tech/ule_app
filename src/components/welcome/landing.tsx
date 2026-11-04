import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { HomeIllustration } from '@/components/illustrations';
import { Button, IconButton } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';

import { fade, fadeUp, pop, slideIn } from './motion';

export function Landing({ onReplay }: { onReplay: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.root} showsVerticalScrollIndicator={false}>
      <Animated.View entering={fade()} style={styles.header}>
        <Logo size={28} />
        <IconButton icon="replay" label="Replay intro" color={Palette.slate} onPress={onReplay} />
      </Animated.View>

      <Animated.View entering={pop(100)} style={styles.art}>
        <HomeIllustration />
      </Animated.View>

      <View style={styles.cards}>
        <Animated.View entering={slideIn(250)}>
          <View style={[styles.card, { transform: [{ rotate: '-1.5deg' }] }]}>
            <View style={styles.ring} />
            <View style={styles.flex}>
              <Text weight="semibold" size={14}>
                Refill cooking gas
              </Text>
              <Text size={12} color={Palette.slateDeep}>
                Tunde · Monthly
              </Text>
            </View>
            <View style={styles.avatar}>
              <Text weight="bold" size={12}>
                T
              </Text>
            </View>
          </View>
        </Animated.View>
        <Animated.View entering={slideIn(380)}>
          <View style={[styles.card, { marginLeft: 24, transform: [{ rotate: '1deg' }] }]}>
            <View style={styles.bar} />
            <View style={styles.flex}>
              <Text weight="semibold" size={14}>
                PTA meeting
              </Text>
              <Text size={12} color={Palette.slateDeep}>
                Sat 10:00 · reminder set
              </Text>
            </View>
          </View>
        </Animated.View>
        <Animated.View entering={slideIn(510)}>
          <View style={[styles.card, { marginRight: 18, transform: [{ rotate: '-0.5deg' }] }]}>
            <View style={styles.low}>
              <Text weight="bold" size={11}>
                LOW
              </Text>
            </View>
            <Text weight="semibold" size={14} style={styles.flex}>
              Rice → added to shopping list
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.copy}>
        <Animated.View entering={fadeUp(600)}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            Run your home without carrying everything in your head.
          </Text>
        </Animated.View>
        <Animated.View entering={fadeUp(700)}>
          <Text size={15} muted style={styles.body}>
            Tasks, family schedules, shopping and household routines — together, built for Nigerian homes.
          </Text>
        </Animated.View>
      </View>

      <Animated.View entering={fadeUp(800)} style={styles.actions}>
        <Button label="Create an account" onPress={() => router.push('/sign-up')} />
        <Button label="Sign in" variant="outline" onPress={() => router.push('/sign-in')} />
        <Button
          label="I was invited to a household"
          variant="ghost"
          size="sm"
          onPress={() => router.push('/join')}
          style={styles.invited}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 28,
    gap: 20,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  art: {
    alignItems: 'center',
  },
  cards: {
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.mist,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Palette.slate,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 4,
    height: 30,
    borderRadius: 2,
    backgroundColor: Palette.coral,
  },
  low: {
    backgroundColor: Palette.surface,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  copy: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    lineHeight: 31,
    letterSpacing: -0.6,
  },
  body: {
    lineHeight: 22,
  },
  actions: {
    gap: 10,
  },
  invited: {
    height: 32,
  },
});
