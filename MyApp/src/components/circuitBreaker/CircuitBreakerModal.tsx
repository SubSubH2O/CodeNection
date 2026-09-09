import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import {
  CircuitBreakerPayload,
  CircuitBreakerOption,
  SwapOption,
  ScopeDownOption,
  RescheduleOption,
  BurnoutDebtOption,
} from '../../types/circuitBreaker';

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

  const renderOptionCard = (opt: CircuitBreakerOption) => {
    return (
      <TouchableOpacity
        key={opt.type}
        style={styles.optionCard}
        onPress={() => onSelectOption(opt)}
      >
        <View style={styles.optionHeader}>
          <View style={styles.badgePill}>
            <Text style={styles.badgePillText}>{opt.badge}</Text>
          </View>
          <Text style={styles.projectedText}>Projected: {opt.projectedLoad}%</Text>
        </View>

        <Text style={styles.optionTitle}>{opt.title}</Text>
        <Text style={styles.optionDesc}>{opt.description}</Text>

        <View style={styles.selectBtn}>
          <Text style={styles.selectBtnText}>Apply Resolution</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={true} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>CIRCUIT BREAKER ACTIVATED</Text>
            <Text style={styles.title}>Overload Threshold Reached</Text>
            <Text style={styles.sub}>
              Adding "{payload.offendingTask.title}" exceeds your daily capacity limit.
            </Text>
          </View>

          {/* Before -> After Impact Card */}
          <View style={styles.impactCard}>
            <View style={styles.impactRow}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>CURRENT</Text>
                <Text style={styles.metricNum}>{payload.currentLoad}%</Text>
              </View>
              <Text style={styles.arrowText}>→</Text>
              <View style={[styles.metricBox, styles.metricBoxOver]}>
                <Text style={styles.metricLabel}>UNPROTECTED</Text>
                <Text style={[styles.metricNum, styles.metricNumOver]}>
                  {payload.projectedLoadWithoutIntervention}%
                </Text>
              </View>
            </View>
            <Text style={styles.impactFooter}>
              Automated intervention required to preserve cognitive equilibrium.
            </Text>
          </View>

          <Text style={styles.sectionHeader}>SELECT AN ACTIONABLE SOLUTION (4 PATHWAYS):</Text>

          <ScrollView style={styles.optionsScroll} contentContainerStyle={styles.optionsContainer}>
            {payload.options.map(renderOptionCard)}
          </ScrollView>

          <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
            <Text style={styles.dismissBtnText}>Cancel Task Addition</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 25, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FAF8F4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DCD6CB',
    alignSelf: 'center',
    marginBottom: 4,
  },
  header: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#C44D56',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#221F1C',
  },
  sub: {
    fontSize: 12,
    color: '#6B6459',
  },
  impactCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricBox: {
    alignItems: 'center',
  },
  metricBoxOver: {
    backgroundColor: '#FDF2F0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#8A8275',
  },
  metricNum: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38332C',
  },
  metricNumOver: {
    color: '#C44D56',
  },
  arrowText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8A8275',
  },
  impactFooter: {
    fontSize: 11,
    color: '#8A8275',
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#5C5449',
    marginTop: 4,
  },
  optionsScroll: {
    maxHeight: 280,
  },
  optionsContainer: {
    gap: 10,
    paddingBottom: 8,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCD6CB',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgePill: {
    backgroundColor: '#EAE6F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B5FA8',
  },
  projectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4C7A67',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#221F1C',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B6459',
    lineHeight: 16,
  },
  selectBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#221F1C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  selectBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  dismissBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8275',
  },
});
