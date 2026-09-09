import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import {
  CircuitBreakerPayload,
  CircuitBreakerOption,
} from '../../types/circuitBreaker';
import { BotanicalTokens } from '../../theme/tokens';

interface CircuitBreakerModalProps {
  payload: CircuitBreakerPayload | null;
  onSelectOption: (option: CircuitBreakerOption) => void;
  onDismiss: () => void;
}

export const CircuitBreakerModal: React.FC<CircuitBreakerModalProps> = ({
  payload,
  onSelectOption,
  onDismiss,
}) => {
  if (!payload || !payload.triggered) return null;

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Tactile Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.titleLine}>
                <Text style={styles.headerEmoji}>🎯</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>
                  {payload.offendingTask.title}
                </Text>
              </View>
              <Text style={styles.headerSub}>
                {payload.offendingTask.durationMinutes}m duration · {payload.offendingTask.category.toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onDismiss}>
              <Text style={styles.closeBtnIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Badges Pod */}
          <View style={styles.badgesRow}>
            <View style={styles.strainBadge}>
              <Text style={styles.strainBadgeText}>⚠️ +{payload.offendingTask.difficulty * 6}% Strain Load</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>High Cognitive Priority</Text>
            </View>
            <View style={styles.branchBadge}>
              <Text style={styles.branchBadgeText}>🌿 Canopy Saturation</Text>
            </View>
          </View>

          {/* Biomarkers / Soil Strain Duo Cards from Stitch */}
          <View style={styles.duoCardsRow}>
            {/* Brain Load */}
            <View style={styles.duoCard}>
              <View style={styles.duoCardHeader}>
                <Text style={styles.duoCardLabel}>🧠 Brain Load</Text>
                <Text style={styles.duoCardValue}>
                  {payload.projectedLoadWithoutIntervention}% Peak
                </Text>
              </View>
              <View style={styles.duoTrack}>
                <View
                  style={[
                    styles.duoFill,
                    {
                      width: `${Math.min(100, payload.projectedLoadWithoutIntervention)}%`,
                      backgroundColor: BotanicalTokens.colors.tertiaryContainer,
                    },
                  ]}
                />
              </View>
              <Text style={styles.duoSubText}>High neuro energy required</Text>
            </View>

            {/* Soil Strain */}
            <View style={styles.duoCard}>
              <View style={styles.duoCardHeader}>
                <Text style={styles.duoCardLabel}>🌶️ Soil Strain</Text>
                <Text style={[styles.duoCardValue, { color: BotanicalTokens.colors.error }]}>
                  8/10 Hot & Dry
                </Text>
              </View>
              <View style={styles.duoTrack}>
                <View
                  style={[
                    styles.duoFill,
                    { width: '85%', backgroundColor: BotanicalTokens.colors.error },
                  ]}
                />
              </View>
              <Text style={[styles.duoSubText, { color: BotanicalTokens.colors.error }]}>
                Risk of leaf wilt
              </Text>
            </View>
          </View>

          {/* Maya Whispers Pod */}
          <View style={styles.mayaWhisperPod}>
            <View style={styles.whisperAvatar}>
              <Text style={styles.whisperEmoji}>🌱</Text>
            </View>
            <View style={styles.whisperTextCol}>
              <Text style={styles.whisperTitle}>Maya whispers ✨</Text>
              <Text style={styles.whisperQuote}>
                "Adding this task pushes canopy saturation past 85%. Select a botanical resolution below to keep your leaves bouncy!"
              </Text>
            </View>
          </View>

          {/* 4 Actionable Resolutions Scroll */}
          <Text style={styles.resolutionsHeading}>BOTANICAL CIRCUIT BREAKER OPTIONS:</Text>
          <ScrollView style={styles.optionsList} contentContainerStyle={styles.optionsContainer}>
            {payload.options.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.optionCard}
                onPress={() => onSelectOption(opt)}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.optionBadgePill}>
                    <Text style={styles.optionBadgeText}>{opt.badge}</Text>
                  </View>
                  <Text style={styles.projectedNum}>Projected Load: {opt.projectedLoad}%</Text>
                </View>
                <Text style={styles.optionTitleText}>{opt.title}</Text>
                <Text style={styles.optionDescText}>{opt.description}</Text>
                <View style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>Apply This Path →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={styles.cancelBtnText}>Dismiss & Cancel Addition</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(60, 40, 20, 0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fffdf9',
    borderTopLeftRadius: BotanicalTokens.radii.xl,
    borderTopRightRadius: BotanicalTokens.radii.xl,
    maxHeight: '92%',
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    ...BotanicalTokens.shadows.modal,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BotanicalTokens.colors.borderSandstone,
    alignSelf: 'center',
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnIcon: {
    fontSize: 12,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  strainBadge: {
    backgroundColor: BotanicalTokens.colors.errorContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BotanicalTokens.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
  },
  strainBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BotanicalTokens.colors.error,
  },
  priorityBadge: {
    backgroundColor: BotanicalTokens.colors.secondaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BotanicalTokens.radii.full,
    borderWidth: 1,
    borderColor: 'rgba(151, 70, 52, 0.2)',
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: BotanicalTokens.colors.secondary,
  },
  branchBadge: {
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BotanicalTokens.radii.full,
  },
  branchBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  duoCardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  duoCard: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.md,
    padding: 10,
    gap: 4,
  },
  duoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duoCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  duoCardValue: {
    fontSize: 10,
    fontWeight: '800',
    color: BotanicalTokens.colors.tertiary,
  },
  duoTrack: {
    height: 6,
    backgroundColor: BotanicalTokens.colors.surfaceContainerHigh,
    borderRadius: 3,
    overflow: 'hidden',
  },
  duoFill: {
    height: '100%',
    borderRadius: 3,
  },
  duoSubText: {
    fontSize: 9,
    fontWeight: '500',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  mayaWhisperPod: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(9, 100, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(9, 100, 68, 0.2)',
    borderRadius: BotanicalTokens.radii.md,
    padding: 10,
    gap: 8,
  },
  whisperAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(46, 125, 91, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whisperEmoji: {
    fontSize: 12,
  },
  whisperTextCol: {
    flex: 1,
    gap: 1,
  },
  whisperTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  whisperQuote: {
    fontSize: 11,
    fontStyle: 'italic',
    color: BotanicalTokens.colors.onSurfaceVariant,
    lineHeight: 15,
  },
  resolutionsHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: BotanicalTokens.colors.textMuted,
    marginTop: 2,
  },
  optionsList: {
    maxHeight: 220,
  },
  optionsContainer: {
    gap: 8,
    paddingBottom: 6,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.md,
    padding: 12,
    gap: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionBadgePill: {
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BotanicalTokens.radii.full,
  },
  optionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  projectedNum: {
    fontSize: 11,
    fontWeight: '800',
    color: BotanicalTokens.colors.primaryContainer,
  },
  optionTitleText: {
    fontSize: 13,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  optionDescText: {
    fontSize: 11,
    color: BotanicalTokens.colors.onSurfaceVariant,
    lineHeight: 15,
  },
  applyBtn: {
    alignSelf: 'flex-start',
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: BotanicalTokens.radii.full,
    marginTop: 2,
  },
  applyBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: BotanicalTokens.colors.textMuted,
  },
});
