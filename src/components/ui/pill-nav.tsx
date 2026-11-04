import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Palette } from '@/constants/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type PillNavItem = {
  key: string;
  label: string;
  icon: IconName;
  active: boolean;
  onPress: () => void;
};

type PillNavProps = {
  items: PillNavItem[];
  /** The larger two-item variant used by the staff and child views. */
  large?: boolean;
};

/** Floating dark pill navigation; the active item expands to show its label. */
export function PillNav({ items, large }: PillNavProps) {
  const insets = useSafeAreaInsets();
  const itemSize = large ? 48 : 44;
  return (
    <View style={[styles.wrap,{ bottom: Math.max(insets.bottom, 12) + 10 }]}>
      <View
        accessibilityRole="tablist"
        style={[styles.pill, large && styles.pillLarge]}>
        {items.map((item) => (
          <Animated.View key={item.key} layout={LinearTransition.duration(220)}>
            <Pressable
              accessibilityRole="tab"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: item.active }}
              onPress={item.onPress}
              style={[
                styles.item,
                { height: itemSize, minWidth: itemSize, borderRadius: itemSize / 2 },
                item.active ? [styles.active, large && styles.activeLarge] : styles.idle,
              ]}>
              <Icon
                name={item.icon}
                size={large ? 20 : 18}
                color={item.active ? Palette.ink : Palette.white}
              />
              {item.active ? (
                <Text weight="bold" size={14} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 5,
    borderRadius: 28,
    backgroundColor: Palette.ink,
    boxShadow: '0 14px 32px rgba(47,47,47,0.30)',
  },
  pillLarge: {
    gap: 6,
    padding: 6,
    borderRadius: 30,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  idle: {
    backgroundColor: Palette.inkRaised,
  },
  active: {
    backgroundColor: Palette.surface,
    paddingLeft: 12,
    paddingRight: 14,
  },
  activeLarge: {
    paddingLeft: 14,
    paddingRight: 16,
    gap: 8,
  },
});
