import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useCoopCircle, useMyReceivedTokens, coopActions } from '../store/useCoopStore';
import { FriendStatusCard } from '../components/coop/FriendStatusCard';
import { TokenInteractionType } from '../types/coop';
import { BotanicalTokens } from '../theme/tokens';

export const CoopScreen: React.FC = () => {
  const circle = useCoopCircle();
  const myTokens = useMyReceivedTokens();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendToken = (memberId: string, token: TokenInteractionType) => {
    coopActions.sendTokenToMember(memberId, token);
    const memberName = circle.members.find((m) => m.id === memberId)?.name || 'Friend';
    const label = token === 'virtual_coffee' ? 'Spring Water' : 'No-Reply Rest Pass';
    setToastMessage(`Sent ${label} to ${memberName}! 🌿`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMistAll = () => {
    circle.members.forEach((m) => {
      coopActions.sendTokenToMember(m.id, 'virtual_coffee');
    });
    setToastMessage('🚿 Misted all plants in the sanctuary!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Stitch Buddy Garden Header Pod */}
      <View style={styles.headerPod}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleLine}>
            <Text style={styles.headerTitle}>🏡 Buddy Garden</Text>
            <View style={styles.beaconDot} />
          </View>
          <Text style={styles.headerSub}>
            {circle.members.length} friends resting · Tap to water & send recovery
          </Text>
        </View>

        <TouchableOpacity style={styles.mistAllBtn} onPress={handleMistAll}>
          <Text style={styles.mistBtnText}>🚿 Mist All</Text>
        </TouchableOpacity>
      </View>

      {toastMessage && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* 2-Column Buddy Card Grid */}
      <View style={styles.gridContainer}>
        {circle.members.map((member) => (
          <FriendStatusCard
            key={member.id}
            member={member}
            onSendToken={handleSendToken}
          />
        ))}
      </View>

      {/* My Received Support Tokens Card */}
      <View style={styles.receivedCard}>
        <Text style={styles.receivedHeading}>MY GARDEN INBOX: HYDRATION RECEIVED</Text>
        <View style={styles.receivedChips}>
          {myTokens.map((tok, idx) => (
            <View key={idx} style={styles.receivedChip}>
              <Text style={styles.receivedChipText}>
                {tok === 'virtual_coffee'
                  ? '💧 Fresh Water from Kai'
                  : '💤 Rest Pass: No Reply Needed'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.backgroundCanvas,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  headerPod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surface,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.lg,
    padding: 12,
    ...BotanicalTokens.shadows.soft,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  beaconDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: BotanicalTokens.colors.primary,
  },
  headerSub: {
    fontSize: 10,
    fontWeight: '500',
    color: BotanicalTokens.colors.textMuted,
  },
  mistAllBtn: {
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BotanicalTokens.radii.full,
    ...BotanicalTokens.shadows.soft,
  },
  mistBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  toastBox: {
    backgroundColor: '#d0ffe3',
    borderWidth: 1,
    borderColor: '#88d6af',
    padding: 8,
    borderRadius: BotanicalTokens.radii.full,
  },
  toastText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.primary,
    textAlign: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  receivedCard: {
    backgroundColor: BotanicalTokens.colors.surface,
    borderRadius: BotanicalTokens.radii.lg,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    padding: 14,
    gap: 8,
    ...BotanicalTokens.shadows.soft,
  },
  receivedHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: BotanicalTokens.colors.textMuted,
  },
  receivedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  receivedChip: {
    backgroundColor: BotanicalTokens.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BotanicalTokens.radii.full,
  },
  receivedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
});
