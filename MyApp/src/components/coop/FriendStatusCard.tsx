import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CoopMember, TokenInteractionType } from '../../types/coop';

interface FriendStatusCardProps {
  member: CoopMember;
  onSendToken: (memberId: string, token: TokenInteractionType) => void;
}

export const FriendStatusCard: React.FC<FriendStatusCardProps> = ({
  member,
  onSendToken,
}) => {
  const getStatusColor = () => {
    switch (member.overallStatus) {
      case 'red':
        return '#C44D56';
      case 'yellow':
        return '#C98A3B';
      default:
        return '#4C7A67';
    }
  };

  const formatTokenName = (tok: TokenInteractionType) => {
    switch (tok) {
      case 'virtual_coffee':
        return 'Coffee';
      case 'no_reply_pass':
        return 'No-Reply Pass';
      default:
        return 'Nod';
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.memberMeta}>
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.avatarTypeTag}>
            Avatar: {member.avatarType === 'tree' ? '5-Branch Tree' : 'Room Cat'}
          </Text>
        </View>

        <View style={[styles.statusBadge, { borderColor: getStatusColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {member.overallStatus.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Primary Fatigue Context */}
      <View style={styles.factorBox}>
        <Text style={styles.factorLabel}>PRIMARY LOAD FACTOR</Text>
        <Text style={styles.factorText}>{member.primaryLoadFactor}</Text>
      </View>

      {/* Mini 5D bars */}
      <View style={styles.miniBars}>
        <View style={styles.miniBarCol}>
          <Text style={styles.miniBarKey}>T</Text>
          <Text style={styles.miniBarVal}>{member.load.time}%</Text>
        </View>
        <View style={styles.miniBarCol}>
          <Text style={styles.miniBarKey}>M</Text>
          <Text style={styles.miniBarVal}>{member.load.mental}%</Text>
        </View>
        <View style={styles.miniBarCol}>
          <Text style={styles.miniBarKey}>P</Text>
          <Text style={styles.miniBarVal}>{member.load.physical}%</Text>
        </View>
        <View style={styles.miniBarCol}>
          <Text style={styles.miniBarKey}>S</Text>
          <Text style={styles.miniBarVal}>{member.load.social}%</Text>
        </View>
        <View style={styles.miniBarCol}>
          <Text style={styles.miniBarKey}>E</Text>
          <Text style={styles.miniBarVal}>{member.load.errands}%</Text>
        </View>
      </View>

      {/* Received Tokens History */}
      {member.recentTokensReceived.length > 0 && (
        <View style={styles.tokenHistory}>
          <Text style={styles.tokenHistoryLabel}>RECENT SUPPORT TOKENS:</Text>
          <View style={styles.tokenChips}>
            {member.recentTokensReceived.map((tok, idx) => (
              <View key={idx} style={styles.tokenChip}>
                <Text style={styles.tokenChipText}>{formatTokenName(tok)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Low-cost Interaction Buttons */}
      <View style={styles.interactionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onSendToken(member.id, 'virtual_coffee')}
        >
          <Text style={styles.actionBtnText}>Send Virtual Coffee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.passBtn]}
          onPress={() => onSendToken(member.id, 'no_reply_pass')}
        >
          <Text style={[styles.actionBtnText, styles.passBtnText]}>Send No-Reply Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  memberMeta: {
    gap: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221F1C',
  },
  avatarTypeTag: {
    fontSize: 11,
    color: '#6B6459',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#FAF8F4',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  factorBox: {
    backgroundColor: '#FAF8F4',
    borderRadius: 8,
    padding: 10,
    gap: 2,
  },
  factorLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  factorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38332C',
  },
  miniBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F7F5EE',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  miniBarCol: {
    alignItems: 'center',
  },
  miniBarKey: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8275',
  },
  miniBarVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#221F1C',
  },
  tokenHistory: {
    gap: 4,
  },
  tokenHistoryLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#8A8275',
  },
  tokenChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tokenChip: {
    backgroundColor: '#EAE6F5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tokenChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B5FA8',
  },
  interactionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#221F1C',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  passBtn: {
    backgroundColor: '#4C7A67',
  },
  passBtnText: {
    color: '#FFFFFF',
  },
});
