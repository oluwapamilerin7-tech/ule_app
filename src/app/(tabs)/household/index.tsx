import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { RoleTag } from '@/components/role-tag';
import { IconButton } from '@/components/ui/button';
import { Card, InfoNote, Row, SectionLabel } from '@/components/ui/card';
import { Avatar, Checkbox } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { format24hShort } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { isAdmin } from '@/state/selectors';

export default function HouseholdScreen() {
  const { state, actions } = useHousehold();
  const admin = isAdmin(state);
  const prefs = state.preferences;
  const staff = state.members.find((m) => m.role === 'staff');
  const child = state.members.find((m) => m.role === 'child');

  return (
    <Screen tabBar>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={28} style={styles.title}>
            {state.household.name}
          </Text>
          <Text weight="medium" size={13} muted>
            {state.plan.people} of {state.plan.peopleLimit} people · Free Plan · {state.household.timezone}
          </Text>
        </View>
        <IconButton
          icon="gear"
          iconSize={20}
          label="Settings"
          onPress={() => router.push('/household/settings')}
        />
      </View>

      <View style={styles.section}>
        <SectionLabel
          title="People & roles"
          right={
            admin ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/household/people')} hitSlop={8}>
                <Text weight="bold" size={13}>
                  Manage
                </Text>
              </Pressable>
            ) : null
          }
        />
        <Card divided>
          {state.members.map((member) => {
            const you = member.id === state.currentUserId;
            return (
              <Pressable
                key={member.id}
                accessibilityRole="button"
                disabled={!admin}
                onPress={() => router.push(`/member/${member.id}`)}
                style={({ pressed }) => [styles.member, pressed && { backgroundColor: Palette.muted }]}>
                <Avatar person={member} size={36} />
                <Text weight="semibold" style={styles.flex}>
                  {member.name}
                  {you ? (
                    <Text weight="medium" muted>
                      {' '}
                      (you)
                    </Text>
                  ) : null}
                </Text>
                <RoleTag role={member.role} isPrimary={member.isPrimary} />
              </Pressable>
            );
          })}
        </Card>
      </View>

      <InfoNote icon="lock" style={styles.privacy}>
        <Text size={13} style={styles.noteText}>
          <Text weight="bold" size={13}>
            Privacy by role.
          </Text>{' '}
          Staff see only their duties and events shared with them; children their own jobs and events shared
          with them. Only admins see the household shopping list — anyone else sees it, with prices, only
          while they&apos;re the shopper. Neither staff nor children see inventory prices.{' '}
          {staff ? (
            <Text
              weight="bold"
              size={13}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/staff-preview', params: { id: staff.id } })}
              style={styles.link}>
              Preview as {staff.name}
            </Text>
          ) : null}
          {staff && child ? ' · ' : null}
          {child ? (
            <Text
              weight="bold"
              size={13}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/child-preview', params: { id: child.id } })}
              style={styles.link}>
              Preview as {child.name}
            </Text>
          ) : null}
        </Text>
      </InfoNote>

      <View style={styles.section}>
        <SectionLabel
          title="Reminders"
          right={
            <Text weight="semibold" size={13} muted>
              Personal
            </Text>
          }
        />
        <Text size={13} muted>
          These settings are just for you.
        </Text>
        <Card divided>
          <Row
            title="Daily summary"
            subtitle={`Every morning at ${prefs.dailySummaryAt}`}
            right={
              <Checkbox
                checked={prefs.dailySummary}
                label="Daily summary"
                onChange={(dailySummary) => actions.updatePreferences({ dailySummary })}
              />
            }
          />
          <Row
            title="Quiet hours"
            subtitle={
              prefs.quietHours
                ? `No reminders ${format24hShort(prefs.quietFrom)} – ${format24hShort(prefs.quietUntil)}`
                : 'Off'
            }
            onPress={() => router.push('/reminders')}
          />
          <Row
            title="Offline & data"
            subtitle={`Last synced ${state.sync.lastSynced} · Low-data mode ${prefs.lowDataMode ? 'on' : 'off'}`}
            onPress={() => router.push('/sync')}
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  section: {
    gap: 8,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  privacy: {
    backgroundColor: Palette.divider,
  },
  noteText: {
    lineHeight: 19,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
