import { Redirect } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import type { IconName } from '@/components/ui/icon';
import { PillNav } from '@/components/ui/pill-nav';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { canViewInventory, isShopper } from '@/state/permissions';
import { currentUser } from '@/state/selectors';
import type { Member } from '@/state/types';

type Tab = { label: string; icon: IconName };

const TABS: Record<string, Tab> = {
  home: { label: 'Home', icon: 'home' },
  tasks: { label: 'Tasks', icon: 'tasks' },
  calendar: { label: 'Calendar', icon: 'calendar' },
  shopping: { label: 'Shopping', icon: 'cart' },
  inventory: { label: 'Inventory', icon: 'box' },
  household: { label: 'Household', icon: 'users' },
};

/**
 * Each role gets its own navigation (design 11, 12, E01):
 *   Admin  — Home, Tasks, Calendar, Shopping, Inventory, Household
 *   Member — Home, Tasks, Calendar, Inventory (settings from the avatar)
 *   Staff  — My duties, Inventory (if allowed)
 *   Child  — My day, Family calendar
 * Members, Staff and Children also get the shopping list while they're today's shopper.
 */
function tabsFor(me: Member | undefined, shopping: boolean): Record<string, Tab> {
  // Only Admins always have the household list; everyone else only while they're the shopper.
  const list: Record<string, Tab> = shopping ? { shopping: { label: 'Shopping list', icon: 'cart' } } : {};
  switch (me?.role) {
    case 'member':
      return {
        home: TABS.home!,
        tasks: TABS.tasks!,
        calendar: TABS.calendar!,
        ...(shopping ? { shopping: TABS.shopping! } : {}),
        inventory: TABS.inventory!,
      };
    case 'staff':
      return {
        home: { label: 'My duties', icon: 'tasks' },
        ...list,
        ...(canViewInventory(me) ? { inventory: TABS.inventory! } : {}),
      };
    case 'child':
      return { home: { label: 'My day', icon: 'tasks' }, ...list, calendar: { label: 'Family calendar', icon: 'calendar' } };
    default:
      return TABS;
  }
}

function PillTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const household = useHousehold();
  const me = currentUser(household.state);
  const tabs = tabsFor(me, !!me && isShopper(household.state, me));
  const large = me?.role === 'staff' || me?.role === 'child';
  return (
    <PillNav
      large={large}
      items={state.routes
        .map((route, index) => ({ route, index }))
        .filter(({ route }) => tabs[route.name])
        .map(({ route, index }) => {
          const focused = state.index === index;
          const tab = tabs[route.name]!;
          return {
            key: route.key,
            label: tab.label,
            icon: tab.icon,
            active: focused,
            onPress: () => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            },
          };
        })}
    />
  );
}

export default function TabsLayout() {
  const { status } = useHousehold();
  // Not ready — the root screen already shows the right thing for every other status
  // (spinner while restoring/switching, ServerUnreachable, create-household, welcome).
  if (status !== 'ready') return <Redirect href="/" />;
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      backBehavior="history"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Palette.background } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="tasks" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="shopping" />
      <Tabs.Screen name="inventory" />
      <Tabs.Screen name="household" />
    </Tabs>
  );
}
