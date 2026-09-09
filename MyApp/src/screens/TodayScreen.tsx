import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useLoadMetrics } from '../store/useLoadStore';
import { useSelectedDate, taskActions, useTasks } from '../store/useTaskStore';
import { AvatarContainer } from '../components/avatar/AvatarContainer';
import { QuickCheckInModal } from '../components/common/QuickCheckInModal';
import { BotanicalTokens } from '../theme/tokens';

interface TodayScreenProps {
  onOpenSoundingBoard: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onOpenSoundingBoard }) => {
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [mayaCardDismissed, setMayaCardDismissed] = useState(false);
  const [mayaBalancedNotice, setMayaBalancedNotice] = useState(false);
  const [mayaPromptText, setMayaPromptText] = useState('');

  const metrics = useLoadMetrics();
  const selectedDate = useSelectedDate();
  const tasks = useTasks();

  const totalScheduledHours = (
    tasks
      .filter((t) => t.scheduledDate === selectedDate && !t.completed)
      .reduce((sum, t) => sum + t.durationMinutes, 0) / 60
  ).toFixed(1);

  const handleLightenSchedule = () => {
    // Find highest flexible task and postpone
    const flexible = tasks.find(
      (t) => t.scheduledDate === selectedDate && t.isFlexible && !t.completed
    );
    if (flexible) {
      taskActions.postponeTask(flexible.id, '2026-09-11');
    }
    setMayaBalancedNotice(true);
    setTimeout(() => {
      setMayaBalancedNotice(false);
      setMayaCardDismissed(true);
    }, 2400);
  };

  const handleSendMayaPrompt = () => {
    if (!mayaPromptText.trim()) return;
    onOpenSoundingBoard();
    setMayaPromptText('');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Status Cluster */}
      <View style={styles.statusClusterRow}>
        <View style={styles.clusterPill}>
          <Text style={styles.clusterIcon}>✨</Text>
          <Text style={styles.clusterText}>Cozy Equilibrium · Day 42</Text>
        </View>
        <TouchableOpacity style={styles.clusterPill} onPress={() => setCheckInVisible(true)}>
          <Text style={styles.clusterIcon}>☀️</Text>
          <Text style={styles.clusterText}>Calibrate</Text>
        </TouchableOpacity>
      </View>

      {/* Vitality & Scheduled Pod Card */}
      <View style={styles.vitalityCard}>
        <View style={styles.vitalityTopRow}>
          <View style={styles.vitalityTitleGroup}>
            <View style={styles.vitalityPulseDot} />
            <Text style={styles.vitalityTitle}>Garden Vitality</Text>
          </View>
          <View style={styles.vitalityValueGroup}>
            <Text style={styles.vitalityPercent}>{100 - Math.round(metrics.overall * 0.4)}%</Text>
            <View style={styles.bloomingBadge}>
              <Text style={styles.bloomingBadgeText}>
                {metrics.status === 'red' ? 'Wilting 🍂' : metrics.status === 'yellow' ? 'Thriving 🌱' : 'Blooming 🌸'}
              </Text>
            </View>
          </View>
        </View>

        {/* Tactile Progress Bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.max(15, 100 - Math.round(metrics.overall * 0.4))}%` },
            ]}
          />
        </View>

        <View style={styles.vitalityFooter}>
          <View style={styles.vitalityFootItem}>
            <Text style={styles.footIcon}>🌱</Text>
            <Text style={styles.footText}>Roots hydrated & stable</Text>
          </View>
          <View style={styles.vitalityFootItem}>
            <Text style={styles.footIcon}>⏱️</Text>
            <Text style={styles.footTextHighlight}>{totalScheduledHours}h Scheduled</Text>
          </View>
        </View>
      </View>

      {/* Interactive Tree Viewport Container */}
      <AvatarContainer load={metrics.dimensions} overallStatus={metrics.status} />

      {/* Maya AI Insight Recommendation Pod */}
      {!mayaCardDismissed && (
        <View style={styles.mayaCard}>
          {mayaBalancedNotice ? (
            <View style={styles.balancedRow}>
              <View style={styles.balancedCheckCircle}>
                <Text style={styles.checkIconText}>✓</Text>
              </View>
              <View>
                <Text style={styles.balancedTitle}>Tree Balanced! 🌿</Text>
                <Text style={styles.balancedSub}>Load trimmed. Leaves are resting happily.</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.mayaTopRow}>
                <View style={styles.mayaAvatarCircle}>
                  <Text style={styles.mayaAvatarEmoji}>🧠</Text>
                </View>
                <View style={styles.mayaTextCol}>
                  <View style={styles.mayaHeaderLine}>
                    <Text style={styles.mayaWarningTitle}>
                      {metrics.status === 'red'
                        ? '🚨 Branch is overloaded!'
                        : '🌱 Equilibrium Suggestion'}
                    </Text>
                    <View style={styles.justNowPill}>
                      <Text style={styles.justNowText}>Just now</Text>
                    </View>
                  </View>
                  <Text style={styles.mayaRecommendationText}>
                    Maya recommends trimming secondary chores tonight to keep your botanical canopy vibrant and well-rested.
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.mayaActionRow}>
                <TouchableOpacity
                  style={styles.lightenBtn}
                  onPress={handleLightenSchedule}
                >
                  <Text style={styles.lightenBtnText}>🌲 Lighten Schedule ✨</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.laterBtn}
                  onPress={() => setMayaCardDismissed(true)}
                >
                  <Text style={styles.laterBtnText}>Later</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}

      {/* Bottom Ask Maya Input Pill */}
      <View style={styles.askMayaBar}>
        <Text style={styles.askMayaIcon}>✨</Text>
        <TextInput
          style={styles.askMayaInput}
          placeholder="Ask Maya Sprout to rebalance chores or help..."
          placeholderTextColor={BotanicalTokens.colors.outline}
          value={mayaPromptText}
          onChangeText={setMayaPromptText}
          onSubmitEditing={handleSendMayaPrompt}
        />
        <TouchableOpacity style={styles.askMayaSendBtn} onPress={handleSendMayaPrompt}>
          <Text style={styles.sendBtnIcon}>🎙️</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <QuickCheckInModal visible={checkInVisible} onClose={() => setCheckInVisible(false)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.backgroundCanvas,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  statusClusterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  clusterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surface,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.full,
    paddingVertical: 5,
    paddingHorizontal: 12,
    gap: 5,
    ...BotanicalTokens.shadows.soft,
  },
  clusterIcon: {
    fontSize: 12,
  },
  clusterText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  vitalityCard: {
    backgroundColor: BotanicalTokens.colors.surface,
    borderRadius: BotanicalTokens.radii.lg,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    padding: 14,
    gap: 8,
    ...BotanicalTokens.shadows.soft,
  },
  vitalityTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalityTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalityPulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BotanicalTokens.colors.primary,
  },
  vitalityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  vitalityValueGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalityPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  bloomingBadge: {
    backgroundColor: 'rgba(255, 218, 211, 0.7)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: BotanicalTokens.radii.full,
  },
  bloomingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: BotanicalTokens.colors.secondary,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(235, 220, 203, 0.6)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: BotanicalTokens.colors.primaryLush,
    borderRadius: 5,
  },
  vitalityFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vitalityFootItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footIcon: {
    fontSize: 11,
  },
  footText: {
    fontSize: 11,
    fontWeight: '500',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  footTextHighlight: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.primary,
  },
  mayaCard: {
    backgroundColor: BotanicalTokens.colors.surface,
    borderRadius: BotanicalTokens.radii.lg,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    padding: 14,
    gap: 10,
    ...BotanicalTokens.shadows.card,
  },
  mayaTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  mayaAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffdad3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mayaAvatarEmoji: {
    fontSize: 16,
  },
  mayaTextCol: {
    flex: 1,
    gap: 2,
  },
  mayaHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mayaWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BotanicalTokens.colors.secondary,
  },
  justNowPill: {
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BotanicalTokens.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(235, 220, 203, 0.7)',
  },
  justNowText: {
    fontSize: 9,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  mayaRecommendationText: {
    fontSize: 11,
    color: BotanicalTokens.colors.onSurfaceVariant,
    lineHeight: 15,
  },
  mayaActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 2,
  },
  lightenBtn: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 8,
    borderRadius: BotanicalTokens.radii.full,
    alignItems: 'center',
    ...BotanicalTokens.shadows.soft,
  },
  lightenBtnText: {
    color: BotanicalTokens.colors.onPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  laterBtn: {
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BotanicalTokens.radii.full,
  },
  laterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  balancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  balancedCheckCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d0ffe3',
    borderWidth: 1,
    borderColor: 'rgba(9, 100, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconText: {
    color: BotanicalTokens.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  balancedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  balancedSub: {
    fontSize: 11,
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  askMayaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    gap: 8,
    marginTop: 4,
    ...BotanicalTokens.shadows.card,
  },
  askMayaIcon: {
    fontSize: 16,
  },
  askMayaInput: {
    flex: 1,
    fontSize: 12,
    color: BotanicalTokens.colors.onSurfaceDark,
    paddingVertical: 6,
  },
  askMayaSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BotanicalTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnIcon: {
    fontSize: 13,
  },
});
