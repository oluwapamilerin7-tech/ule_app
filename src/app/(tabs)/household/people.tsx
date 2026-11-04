import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/ui/button';
import { Card, InfoNote, SectionLabel } from '@/components/ui/card';
import { Avatar } from '@/components/ui/controls';
import { BackButton, Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Palette } from '@/constants/theme';
import { useHousehold } from '@/state/household';
import { householdFull, ROLE_LABELS, roleTitle } from '@/state/selectors';

/** S10 — people and roles, against the Free Plan's 5-person limit. */
export default function PeopleScreen() {
  const { state, actions } = useHousehold();
  const { people, peopleLimit } = state.plan;
  const full = householdFull(state);

  return (
    <Screen tabBar>
      <View style={styles.header}>
        <BackButton fallback="/household" />
        <View style={styles.flex}>
          <Text accessibilityRole="header" display size={26}>
            People
          </Text>
          <Text size={13} muted>
            {people} of {peopleLimit} people · Free Plan
          </Text>
        </View>
      </View>

      <View style={styles.meter}>
        <View style={styles.meterLabels}>
          <Text weight="semibold" size={13}>
            Free Plan
          </Text>
          <Text weight="bold" size={13}>
            {people} of {peopleLimit} people
          </Text>
        </View>
        <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <View style={[styles.fill, { width: `${Math.min(100, (people / peopleLimit) * 100)}%` }]} />
        </View>
      </View>

      <Button
        label="Add someone"
        icon="user-plus"
        size="md"
        onPress={() => router.push(full ? { pathname: '/plan-limit', params: { kind: 'household_full' } } : '/invite')}
      />

      <View style={styles.section}>
        <SectionLabel title="Members" />
        <Card divided>
          {state.members.map((member) => {
            const you = member.id === state.currentUserId;
            // Nobody removes the Primary Admin, and nobody removes themselves (they leave instead).
            const fixed = you || member.isPrimary;
            return (
              <View key={member.id} style={styles.member}>
                <Avatar person={member} size={36} />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/member/${member.id}`)}
                  style={styles.flex}>
                  <Text weight="semibold">
                    {member.name}
                    {you ? (
                      <Text weight="medium" muted>
                        {' '}
                        (you)
                      </Text>
                    ) : null}
                  </Text>
                  <Text size={12} muted>
                    {roleTitle(member)}
                    {member.isPrimary ? ' · created this household' : you ? '' : ' · change role'}
                  </Text>
                </Pressable>
                {fixed ? (
                  <Text size={12} muted style={styles.cannot}>
                    {member.isPrimary ? (you ? "Can't leave" : "Can't be removed") : "Can't remove yourself"}
                  </Text>
                ) : (
                  <IconButton
                    icon="trash"
                    iconSize={20}
                    variant="plain"
                    color={Palette.danger}
                    label={`Remove ${member.name}`}
                    onPress={() => router.push(`/remove-member/${member.id}`)}
                  />
                )}
              </View>
            );
          })}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionLabel title="Pending invites" />
        {state.invites.length === 0 ? (
          <View style={[styles.invite, styles.noInvites]}>
            <Text size={13} muted style={styles.note}>
              No pending invites. Pending invites count towards the {peopleLimit}-person limit.
            </Text>
          </View>
        ) : null}
        {state.invites.map((invite) => (
            <View key={invite.id} style={styles.invite}>
              <View style={styles.inviteAvatar}>
                <Text weight="bold" size={14} muted>
                  {invite.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text weight="semibold">{invite.name}</Text>
                <Text size={12} muted>
                  {invite.role === 'admin' ? 'Supporting Admin' : ROLE_LABELS[invite.role]} · {invite.sentLabel} · expires in{' '}
                  {invite.expiresInDays}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => actions.resendInvite(invite.id)}
                style={styles.resend}>
                <Text weight="semibold" size={13}>
                  {invite.sentLabel === 'sent just now' ? 'Sent' : 'Resend'}
                </Text>
              </Pressable>
              <IconButton
                icon="close"
                iconSize={16}
                variant="soft"
                size={34}
                label={`Cancel invite for ${invite.name}`}
                onPress={() => actions.cancelInvite(invite.id)}
              />
            </View>
        ))}
      </View>

      <InfoNote icon="lock" tone="plain">
        <Text size={12} muted style={styles.note}>
          Only admins can add or remove people. Each person counts once, whatever their role. There’s always one Primary
          Admin; a Supporting Admin is optional.
        </Text>
      </InfoNote>
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
  section: {
    gap: 8,
  },
  meter: {
    gap: 6,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.track,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Palette.coral,
  },
  noInvites: {
    paddingVertical: 14,
  },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
  },
  cannot: {
    paddingRight: 6,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Palette.grey,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  inviteAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resend: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Palette.line,
    justifyContent: 'center',
  },
  note: {
    lineHeight: 17,
  },
});
