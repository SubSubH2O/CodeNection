import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CoopMember, TokenInteractionType } from '../../types/coop';
import { BotanicalTokens } from '../../theme/tokens';

interface FriendStatusCardProps {
  member: CoopMember;
  onSendToken: (memberId: string, token: TokenInteractionType) => void;
}

export const FriendStatusCard: React.FC<FriendStatusCardProps> = ({
  member,
  onSendToken,
}) => {
  const isOverloaded = member.overallStatus === 'red';
  const isYellow = member.overallStatus === 'yellow';

  const potColor = isOverloaded ? '#b96a59' : '#c97b6a';
  const sproutColor = isOverloaded ? '#6f7a72' : '#2e7d5b';

  return (
    <View style={styles.card}>
      {/* Quote bubble at top */}
      <View style={styles.quoteBubble}>
        <Text style={styles.quoteText} numberOfLines={1}>
          💬 "{member.primaryLoadFactor}"
        </Text>
      </View>

      {/* Center Plant Illustration & Percentage Badge */}
      <View style={styles.avatarSection}>
        <View style={styles.plantVisual}>
          {/* Sprout Plant Stem & Foliage */}
          <View
            style={[
              styles.foliageClump,
              {
                backgroundColor: sproutColor,
                transform: isOverloaded ? [{ translateY: 6 }, { rotate: '-12deg' }] : [{ translateY: 0 }],
              },
            ]}
          >
            <Text style={styles.plantFaceEmoji}>{isOverloaded ? '🥀' : isYellow ? '🌿' : '🌸'}</Text>
          </View>
          {/* Terracotta Pot */}
          <View style={[styles.terracottaPot, { backgroundColor: potColor }]}>
            <View style={styles.potRim} />
          </View>
        </View>

        {/* Overload Percentage Badge */}
        <View
          style={[
            styles.percentBadge,
            isOverloaded && styles.percentBadgeRed,
            isYellow && styles.percentBadgeYellow,
          ]}
        >
          <Text
            style={[
              styles.percentText,
              isOverloaded && styles.percentTextRed,
              isYellow && styles.percentTextYellow,
            ]}
          >
            {member.load.time}%
          </Text>
        </View>
      </View>

      {/* Member Info */}
      <View style={styles.infoCol}>
        <Text style={styles.memberName}>{member.name}</Text>
        <Text style={styles.statusLabel}>
          {isOverloaded ? 'Leaves Drooping · Rest Due' : isYellow ? 'Steady Hydration' : 'Lush & Blooming'}
        </Text>
      </View>

      {/* 1-Tap Botanical Support Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.waterBtn}
          onPress={() => onSendToken(member.id, 'virtual_coffee')}
        >
          <Text style={styles.waterBtnText}>💧 Water Sprout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.passBtn}
          onPress={() => onSendToken(member.id, 'no_reply_pass')}
        >
          <Text style={styles.passBtnText}>💤 Rest Pass</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.lg,
    padding: 10,
    gap: 8,
    ...BotanicalTokens.shadows.soft,
  },
  quoteBubble: {
    backgroundColor: '#fcf5eb',
    borderWidth: 1,
    borderColor: '#eedecf',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BotanicalTokens.radii.full,
  },
  quoteText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#423528',
  },
  avatarSection: {
    alignItems: 'center',
    position: 'relative',
    height: 70,
    justifyContent: 'center',
  },
  plantVisual: {
    alignItems: 'center',
  },
  foliageClump: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -8,
  },
  plantFaceEmoji: {
    fontSize: 14,
  },
  terracottaPot: {
    width: 44,
    height: 32,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    alignItems: 'center',
    zIndex: 1,
  },
  potRim: {
    width: 48,
    height: 6,
    backgroundColor: '#c97b6a',
    borderRadius: 3,
  },
  percentBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#d0ffe3',
    borderWidth: 1,
    borderColor: '#88d6af',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BotanicalTokens.radii.full,
  },
  percentBadgeYellow: {
    backgroundColor: '#ffddb2',
    borderColor: '#ffb94c',
  },
  percentBadgeRed: {
    backgroundColor: '#ffdad6',
    borderColor: '#ffb4a4',
  },
  percentText: {
    fontSize: 9,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  percentTextYellow: {
    color: BotanicalTokens.colors.tertiary,
  },
  percentTextRed: {
    color: BotanicalTokens.colors.error,
  },
  infoCol: {
    alignItems: 'center',
    gap: 1,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: BotanicalTokens.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  waterBtn: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 5,
    borderRadius: BotanicalTokens.radii.full,
    alignItems: 'center',
  },
  waterBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#ffffff',
  },
  passBtn: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingVertical: 5,
    borderRadius: BotanicalTokens.radii.full,
    alignItems: 'center',
  },
  passBtnText: {
    fontSize: 9,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
});
