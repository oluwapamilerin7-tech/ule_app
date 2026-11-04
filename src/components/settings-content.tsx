import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, Row, SectionLabel } from '@/components/ui/card';
import { Avatar, Checkbox } from '@/components/ui/controls';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { format24hShort } from '@/lib/dates';
import { useHousehold } from '@/state/household';
import { currentUser, primaryAdmin, ROLE_LABELS, roleTitle, runsMaxHouseholds } from '@/state/selectors';

/**
 * Settings, shaped by role (S11/S12 Admin, E11 Member, G02 Staff, C09 Child). Admins open it
 * from the Household tab; everyone else from their avatar on Home.
 */
export function SettingsContent({ tabBar, fallback }: { tabBar?: boolean; fallback: '/household' | '/home' }) {
  const { state, actions } = useHousehold();
  const me = currentUser(state);
  const prefs = state.preferences;
  if (!me) return null;

  const admins = state.members.filter((m) => m.role === 'admin');
  const otherAdmins = admins.filter((m) => m.id !== me.id).map((m) => m.name);
  const adminNames = admins.map((m) => m.name).join(' or ');
  const primary = primaryAdmin(state);
  const onOff = (on: boolean) => (on ? 'On' : 'Off');

  return (
    <Screen tabBar={tabBar} gap={18}>
      <View style={styles.header}>
        <BackButton fallback={fallback} />
        <Text accessibilityRole="header" display size={26}>
          Settings
        </Text>
      </View>

      <Card style={styles.profile}>
        <Avatar person={me} size={56} />
        <View style={styles.flex}>
          <Text weight="bold" size={17}>
            {me.fullName ?? me.name}
          </Text>
          <Text size={13} muted>
            {me.username ? `@${me.username} · ` : ''}
            {roleTitle(me)}
          </Text>
        </View>
      </Card>

      <View style={styles.section}>
        <SectionLabel title="Account" />
        <Card divided>
          {me.role !== 'child' ? <Row title="Email" value={me.email ?? 'Not set'} /> : null}
          <Row
            title="Change password"
            onPress={() => router.push({ pathname: '/new-password', params: { from: 'settings' } })}
          />
          {me.role !== 'child' ? (
            <Row
              title="Keep me signed in on this phone"
              right={
                <Checkbox
                  checked={prefs.keepSignedIn}
                  label="Keep me signed in on this phone"
                  onChange={(keepSignedIn) => actions.updatePreferences({ keepSignedIn })}
                />
              }
            />
          ) : null}
        </Card>
      </View>

      {me.role === 'admin' ? (
        <View style={styles.section}>
          <SectionLabel
            title="Household"
            right={
              <Text weight="semibold" size={13} muted>
                {otherAdmins.length ? `admins only · shared with ${otherAdmins.join(', ')}` : 'admins only'}
              </Text>
            }
          />
          <Card divided>
            <Row title="Household name" value={state.household.name} />
            <Row
              title="People & roles"
              value={`${state.plan.people} of ${state.plan.peopleLimit} · Free Plan`}
              onPress={() => router.push('/household/people')}
            />
            <Row title="Time zone" value={state.household.timezoneShort} />
            <Row title="What each role can see" onPress={() => router.push('/household')} />
            <Row
              title="Create a household"
              onPress={() =>
                router.push(
                  runsMaxHouseholds(state) ? { pathname: '/plan-limit', params: { kind: 'one_household' } } : '/create-household',
                )
              }
            />
          </Card>
          {!me.isPrimary && primary ? (
            <Text size={12} muted style={styles.note}>
              {primary.name} is the Primary Admin. If {primary.name} can’t get into their account, contact Ulé through Help &amp;
              contact us and we’ll help recover the household.
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionLabel title="Households" />
        <Card divided>
          <Row
            title="My households"
            value={`${state.myHouseholds.length}`}
            onPress={() => router.push('/my-households')}
          />
        </Card>
      </View>

      {me.role === 'member' ? (
        <View style={styles.section}>
          <SectionLabel title="My role" />
          <Card divided>
            <Row title={ROLE_LABELS[me.role]} subtitle={`Set by ${adminNames}. Ask an Admin to change it.`} />
          </Card>
        </View>
      ) : null}

      {me.role === 'staff' ? (
        <View style={styles.section}>
          <SectionLabel title={`What I can do · set by ${admins[0]?.name ?? 'an admin'}`} />
          <Card divided>
            <Row title="Can update supplies" value={onOff(me.canUpdateSupplies)} />
            <Row title="Can send shopping requests" value={onOff(me.canSendRequests)} />
            <Row title="Can see inventory prices" value={onOff(me.canSeePrices)} />
          </Card>
          <Text size={12} muted>
            You always see shopping list prices when you&apos;re the shopper. Only an Admin can change these.
          </Text>
        </View>
      ) : null}

      {me.role === 'child' ? (
        <View style={styles.section}>
          <SectionLabel title="Reminders" />
          <Card divided>
            <Row title="Reminders" subtitle="For your tasks and events" onPress={() => router.push('/reminders')} />
          </Card>
        </View>
      ) : (
        <View style={styles.section}>
          <SectionLabel title="Notifications" />
          <Card divided>
            <Row
              title="Quiet hours"
              value={
                prefs.quietHours ? `${format24hShort(prefs.quietFrom)} – ${format24hShort(prefs.quietUntil)}` : 'Off'
              }
              onPress={() => router.push('/reminders')}
            />
            <Row
              title="Daily summary"
              value={prefs.dailySummary ? prefs.dailySummaryAt : 'Off'}
              onPress={() => router.push('/reminders')}
            />
          </Card>
        </View>
      )}

      <View style={styles.section}>
        <SectionLabel title="App" />
        <Card divided>
          {me.role !== 'child' ? (
            <>
              <Row
                title="Low-data mode"
                subtitle="Sync on Wi-Fi only; no image previews"
                right={
                  <Checkbox
                    checked={prefs.lowDataMode}
                    label="Low-data mode"
                    onChange={(lowDataMode) => actions.updatePreferences({ lowDataMode })}
                  />
                }
              />
              <Row
                title="Offline & sync"
                value={
                  state.sync.pending.length ? `${state.sync.pending.length} waiting` : `Synced ${state.sync.lastSynced}`
                }
                onPress={() => router.push('/sync')}
              />
              <Row title="Language" value="English" />
            </>
          ) : null}
          <Row title="Appearance" value="Light" />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel title={me.role === 'child' ? 'Help' : 'Privacy & support'} />
        <Card divided>
          <Row title="Send beta feedback" onPress={() => router.push('/feedback')} />
        </Card>
      </View>

      <View style={styles.footer}>
        <Button label="Sign out" variant="outline" size="md" onPress={() => router.push('/sign-out')} />
        {me.isPrimary ? (
          <>
            <Button
              label="Delete household"
              variant="danger-outline"
              size="md"
              onPress={() => router.push('/delete-household')}
            />
            <Text size={12} muted style={styles.version}>
              You created {state.household.name}, so you can’t leave it. You can delete it instead.
            </Text>
          </>
        ) : me.role !== 'child' ? (
          <Button
            label="Leave household"
            variant="danger-outline"
            size="md"
            onPress={() => router.push({ pathname: '/leave-household', params: { id: state.household.id } })}
          />
        ) : null}
        <Text size={12} muted style={styles.version}>
          Ulé · beta
        </Text>
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
    alignItems: 'center',
    gap: 12,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
  },
  section: {
    gap: 8,
  },
  footer: {
    gap: 10,
  },
  version: {
    textAlign: 'center',
    color: Palette.slate,
  },
  note: {
    lineHeight: 17,
  },
});
