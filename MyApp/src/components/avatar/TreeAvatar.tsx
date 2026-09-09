import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
  const timeCol = getCanopyColor(time.load);

  return (
    <View style={styles.viewportCard}>
      {/* Sky Glow */}
      <View style={styles.skyGlow} />

      {/* Top Center Badge: Time Load */}
      <View style={styles.timeBadgeWrap}>
        <View style={styles.pillBadge}>
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
          {mental.load > 75 ? 'Cognitive Heavy' : 'Deep Focus'}
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
          <Text style={styles.badgeSub}>Restful Circle</Text>
        )}
      </View>

      {/* Main Tree Structure */}
      <View style={styles.treeContainer}>
        {/* Top Canopy (Time) */}
        <View
          style={[
            styles.canopyCrown,
            { backgroundColor: timeCol.main },
            time.isDrooping && styles.canopyDrooping,
          ]}
        >
          <View style={[styles.canopyInnerHighlight, { backgroundColor: timeCol.highlight }]} />
        </View>

        {/* Middle Branch Clumps */}
        <View style={styles.midCanopyRow}>
          {/* Upper Left Canopy (Mental) */}
          <View
            style={[
              styles.canopyMental,
              { backgroundColor: mentalCol.main },
              mental.isDrooping && styles.canopyDrooping,
            ]}
          >
            <View style={[styles.canopyInnerHighlight, { backgroundColor: mentalCol.highlight }]} />
          </View>

          {/* Upper Right Canopy (Social) */}
          <View
            style={[
              styles.canopySocial,
              { backgroundColor: socialCol.main },
              social.isDrooping && styles.canopyDrooping,
            ]}
          >
            <View style={[styles.canopyInnerHighlight, { backgroundColor: socialCol.highlight }]} />
          </View>
        </View>

        {/* Lower Branch Clumps */}
        <View style={styles.lowerCanopyRow}>
          {/* Lower Left Canopy (Physical) */}
          <View
            style={[
              styles.canopyPhysical,
              { backgroundColor: physicalCol.main },
              physical.isDrooping && styles.canopyDrooping,
            ]}
          >
            <View style={[styles.canopyInnerHighlight, { backgroundColor: physicalCol.highlight }]} />
          </View>

          {/* Central Trunk */}
          <View style={styles.trunk}>
            {/* Diagonal Branch Bars */}
            <View style={[styles.diagonalBranch, styles.branchUpperLeft]} />
            <View style={[styles.diagonalBranch, styles.branchUpperRight]} />
            <View style={[styles.diagonalBranch, styles.branchLowerLeft]} />
            <View style={[styles.diagonalBranch, styles.branchLowerRight]} />
          </View>

          {/* Lower Right Canopy (Errands) */}
          <View
            style={[
              styles.canopyErrands,
              { backgroundColor: errandsCol.main },
              errands.isDrooping && styles.canopyDrooping,
            ]}
          >
            <View style={[styles.canopyInnerHighlight, { backgroundColor: errandsCol.highlight }]} />
          </View>
        </View>

        {/* Base Mound & Soil Ground Line */}
        <View style={styles.groundContainer}>
          <View style={styles.grassMound} />
          <View style={styles.soilEarth} />
        </View>
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
  treeContainer: {
    alignItems: 'center',
    width: '100%',
  },
  canopyCrown: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    marginBottom: -25,
  },
  canopyInnerHighlight: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  midCanopyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 220,
    zIndex: 3,
    marginBottom: -15,
  },
  canopyMental: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canopySocial: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lowerCanopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    zIndex: 2,
  },
  canopyPhysical: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
  },
  canopyErrands: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  canopyDrooping: {
    transform: [{ translateY: 8 }],
  },
  trunk: {
    width: 26,
    height: 140,
    backgroundColor: BotanicalTokens.colors.treeTrunk,
    borderRadius: 13,
    zIndex: 1,
    position: 'relative',
  },
  diagonalBranch: {
    position: 'absolute',
    width: 38,
    height: 10,
    backgroundColor: BotanicalTokens.colors.treeTrunk,
    borderRadius: 5,
  },
  branchUpperLeft: {
    top: 30,
    left: -28,
    transform: [{ rotate: '-35deg' }],
  },
  branchUpperRight: {
    top: 30,
    right: -28,
    transform: [{ rotate: '35deg' }],
  },
  branchLowerLeft: {
    top: 75,
    left: -32,
    transform: [{ rotate: '-25deg' }],
  },
  branchLowerRight: {
    top: 75,
    right: -32,
    transform: [{ rotate: '25deg' }],
  },
  groundContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -8,
  },
  grassMound: {
    width: '90%',
    height: 8,
    backgroundColor: BotanicalTokens.colors.grassMound,
    borderRadius: 4,
  },
  soilEarth: {
    width: '96%',
    height: 18,
    backgroundColor: BotanicalTokens.colors.soilEarth,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    marginTop: 2,
  },
});
