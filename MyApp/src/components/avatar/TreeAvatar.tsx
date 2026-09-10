import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { TreeAvatarState } from '../../types/avatar';
import { BotanicalTokens } from '../../theme/tokens';

interface TreeAvatarProps {
  treeState: TreeAvatarState;
  onPruneSocial?: () => void;
}

export const TreeAvatar: React.FC<TreeAvatarProps> = ({ treeState, onPruneSocial }) => {
  const branches = treeState.branches;

  const mental = branches.mental;
  const social = branches.social;
  const physical = branches.physical;
  const errands = branches.errands;
  const time = branches.time;

  const getCanopyColor = (load: number) => {
    if (load > 80) return { main: '#ba1a1a', highlight: '#e57373' };
    if (load > 60) return { main: '#c48a3f', highlight: '#f5b041' };
    return { main: '#40916c', highlight: '#52b788' };
  };

  const mentalCol = getCanopyColor(mental.load);
  const socialCol = getCanopyColor(social.load);
  const physicalCol = getCanopyColor(physical.load);
  const errandsCol = getCanopyColor(errands.load);
  const overallStatus = treeState.overallStatus;
  const isAnyDrooping =
    mental.isDrooping || social.isDrooping || physical.isDrooping || errands.isDrooping || time.isDrooping;

  // Dynamic tree asset selection based on health state
  const getTreeSource = () => {
    if (overallStatus === 'red') {
      return require('../../../assets/cartoon_tree_wilting.png');
    }
    if (overallStatus === 'yellow' || isAnyDrooping) {
      return require('../../../assets/cartoon_tree_tired.png');
    }
    // High vitality / green
    return require('../../../assets/cartoon_tree_blooming.png');
  };

  const getStatusLabel = () => {
    if (overallStatus === 'red') return { text: 'Overburdened · Needs Care', color: '#ba1a1a', bg: '#ffdad6' };
    if (overallStatus === 'yellow' || isAnyDrooping) return { text: 'Strained · Gentle Pace', color: '#8c5000', bg: '#ffe082' };
    return { text: 'Flourishing · In Equilibrium', color: '#1b5e20', bg: '#c8e6c9' };
  };

  const statusMeta = getStatusLabel();

  return (
    <View style={styles.viewportCard}>
      {/* Dynamic Sky Glow */}
      <View
        style={[
          styles.skyGlow,
          overallStatus === 'red' && styles.skyGlowRed,
          overallStatus === 'yellow' && styles.skyGlowYellow,
        ]}
      />

      {/* Dynamic Health State Banner */}
      <View style={[styles.treeHealthTag, { backgroundColor: statusMeta.bg }]}>
        <Text style={[styles.treeHealthTagText, { color: statusMeta.color }]}>
          {statusMeta.text}
        </Text>
      </View>

      {/* Top Center Badge: Time Load */}
      <View style={styles.timeBadgeWrap}>
        <View style={[styles.pillBadge, time.status === 'red' && styles.pillBadgeAlert]}>
          <Text style={styles.badgeIcon}>⏳</Text>
          <Text style={styles.badgeText}>
            Time Load: <Text style={styles.badgeBold}>{(time.load * 0.08).toFixed(1)}h</Text>
          </Text>
        </View>
      </View>

      {/* Badge Upper Left: Mental */}
      <View style={styles.mentalBadgeWrap}>
        <View style={[styles.pillBadge, mental.status === 'red' && styles.pillBadgeAlert]}>
          <View style={[styles.statusDot, { backgroundColor: mentalCol.main }]} />
          <Text style={[styles.badgeText, mental.status === 'red' && styles.textAlert]}>
            Mental {mental.load}%
          </Text>
        </View>
        <Text style={styles.badgeSub}>
          {mental.load > 75 ? 'Heavy Cognitive' : mental.load > 50 ? 'Moderate Work' : 'Clear Focus'}
        </Text>
      </View>

      {/* Badge Upper Right: Social */}
      <View style={styles.socialBadgeWrap}>
        <View style={[styles.pillBadge, social.status === 'red' && styles.pillBadgeAlert]}>
          <Text style={styles.badgeIcon}>{social.status === 'red' ? '⚠️' : '💬'}</Text>
          <Text style={[styles.badgeText, social.status === 'red' && styles.textAlert]}>
            Social {social.load}%
          </Text>
        </View>
        {social.status === 'red' ? (
          <TouchableOpacity
            style={styles.pruneBtn}
            onPress={onPruneSocial}
          >
            <Text style={styles.pruneBtnText}>✂️ Prune Load</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.badgeSub}>
            {social.load > 50 ? 'Active Circle' : 'Quiet Rest'}
          </Text>
        )}
      </View>

      {/* Illustrated Dynamic Cartoon Tree Graphic */}
      <View style={styles.treeContainer}>
        {/* Dynamic Branch Aura Glow */}
        <View
          style={[
            styles.treeAura,
            overallStatus === 'red' && styles.treeAuraRed,
            overallStatus === 'yellow' && styles.treeAuraYellow,
          ]}
        />
        <Image
          source={getTreeSource()}
          style={[
            styles.treeImage,
            isAnyDrooping && styles.treeDrooping,
            overallStatus === 'red' && styles.treeWiltingTilt,
          ]}
          resizeMode="contain"
        />
      </View>

      {/* Badge Lower Left: Physical */}
      <View style={styles.physicalBadgeWrap}>
        <View style={[styles.pillBadge, physical.status === 'red' && styles.pillBadgeAlert]}>
          <Text style={styles.badgeIcon}>💧</Text>
          <Text style={[styles.badgeText, physical.status === 'red' && styles.textAlert]}>
            Physical {physical.load}%
          </Text>
        </View>
        <Text style={styles.badgeSub}>
          {physical.load > 70 ? 'Needs Recovery' : 'Hydrated & Cozy'}
        </Text>
      </View>

      {/* Badge Lower Right: Errands */}
      <View style={styles.errandsBadgeWrap}>
        <View style={[styles.pillBadge, errands.status === 'red' && styles.pillBadgeAlert]}>
          <Text style={styles.badgeIcon}>🧺</Text>
          <Text style={[styles.badgeText, errands.status === 'red' && styles.textAlert]}>
            Errands {errands.load}%
          </Text>
        </View>
        <Text style={styles.badgeSub}>
          {errands.load > 70 ? 'Tasks Backlogged' : 'All Tended'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  viewportCard: {
    width: '100%',
    height: 310,
    backgroundColor: BotanicalTokens.colors.surfaceBright,
    borderRadius: BotanicalTokens.radii.lg,
    borderWidth: 1.5,
    borderColor: BotanicalTokens.colors.borderSandstone,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    ...BotanicalTokens.shadows.card,
    marginVertical: 6,
  },
  skyGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(255, 221, 178, 0.25)',
  },
  skyGlowRed: {
    backgroundColor: 'rgba(255, 180, 171, 0.35)',
  },
  skyGlowYellow: {
    backgroundColor: 'rgba(255, 230, 160, 0.3)',
  },
  treeHealthTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BotanicalTokens.radii.full,
    zIndex: 12,
  },
  treeHealthTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  timeBadgeWrap: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 10,
  },
  mentalBadgeWrap: {
    position: 'absolute',
    top: 38,
    left: 10,
    zIndex: 10,
    gap: 2,
  },
  socialBadgeWrap: {
    position: 'absolute',
    top: 38,
    right: 10,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 3,
  },
  physicalBadgeWrap: {
    position: 'absolute',
    bottom: 36,
    left: 10,
    zIndex: 10,
    gap: 2,
  },
  errandsBadgeWrap: {
    position: 'absolute',
    bottom: 36,
    right: 10,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 2,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: BotanicalTokens.radii.full,
    gap: 4,
    ...BotanicalTokens.shadows.soft,
  },
  pillBadgeAlert: {
    backgroundColor: '#ffdad6',
    borderColor: '#ff9881',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeIcon: {
    fontSize: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  badgeBold: {
    color: BotanicalTokens.colors.primary,
    fontWeight: '800',
  },
  textAlert: {
    color: '#93000a',
  },
  badgeSub: {
    fontSize: 9,
    fontWeight: '600',
    color: BotanicalTokens.colors.textMuted,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  pruneBtn: {
    backgroundColor: BotanicalTokens.colors.secondary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BotanicalTokens.radii.full,
    ...BotanicalTokens.shadows.soft,
  },
  pruneBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  treeAura: {
    position: 'absolute',
    width: 240,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(64, 145, 108, 0.08)',
    top: 20,
  },
  treeAuraRed: {
    backgroundColor: 'rgba(186, 26, 26, 0.12)',
  },
  treeAuraYellow: {
    backgroundColor: 'rgba(196, 138, 63, 0.12)',
  },
  treeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 250,
    position: 'relative',
  },
  treeImage: {
    width: 280,
    height: 230,
  },
  treeDrooping: {
    transform: [{ translateY: 10 }, { scale: 0.96 }],
  },
  treeWiltingTilt: {
    transform: [{ translateY: 16 }, { rotate: '-2.5deg' }, { scale: 0.92 }],
  },
});
