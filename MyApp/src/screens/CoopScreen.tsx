import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useCoopCircle, useMyReceivedTokens, coopActions } from '../store/useCoopStore';
import { FriendStatusCard } from '../components/coop/FriendStatusCard';
import { TokenInteractionType } from '../types/coop';

export const CoopScreen: React.FC = () => {
  const circle = useCoopCircle();
  const myTokens = useMyReceivedTokens();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendToken = (memberId: string, token: TokenInteractionType) => {
    coopActions.sendTokenToMember(memberId, token);
    const memberName = circle.members.find((m) => m.id === memberId)?.name || 'Friend';
    const label = token === 'virtual_coffee' ? 'Virtual Coffee' : 'No-Reply Pass';
    setToastMessage(`Sent ${label} to ${memberName}.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CO-OP DEN</Text>
        <Text style={styles.title}>{circle.name} (Private Circle)</Text>
        <Text style={styles.sub}>
          Shared fatigue awareness among 2-3 trusted peers. Zero leaderboards, zero competitive pressure.
        </Text>
      </View>

      {toastMessage && (
        <View style={styles.toastBox}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* My Received Tokens */}
      <View style={styles.receivedBox}>
        <Text style={styles.receivedTitle}>MY INBOX: SUPPORT RECEIVED TODAY</Text>
        <View style={styles.receivedChips}>
          {myTokens.map((tok, idx) => (
            <View key={idx} style={styles.receivedChip}>
              <Text style={styles.receivedChipText}>
                {tok === 'virtual_coffee' ? 'Coffee received' : 'No-Reply Pass (rest approved)'}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Circle Members */}
      <View style={styles.membersSection}>
        <Text style={styles.sectionHeader}>CIRCLE MEMBERS (REAL-TIME MIRROR):</Text>
        {circle.members.map((member) => (
          <FriendStatusCard
            key={member.id}
            member={member}
            onSendToken={handleSendToken}
          />
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 2,
    marginTop: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#4C7A67',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#221F1C',
  },
  sub: {
    fontSize: 12,
    color: '#6B6459',
    lineHeight: 16,
  },
  toastBox: {
    backgroundColor: '#F2F8F5',
    borderWidth: 1,
    borderColor: '#C2DFD2',
    padding: 10,
    borderRadius: 8,
  },
  toastText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2C6442',
    textAlign: 'center',
  },
  receivedBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  receivedTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  receivedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  receivedChip: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  receivedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38332C',
  },
  membersSection: {
    gap: 12,
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#5C5449',
  },
});
