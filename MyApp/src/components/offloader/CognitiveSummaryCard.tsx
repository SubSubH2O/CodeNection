import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExtractedTaskCandidate } from '../../types/offloader';

interface CognitiveSummaryCardProps {
  candidate: ExtractedTaskCandidate;
  onCommitToSchedule: (taskCandidate: ExtractedTaskCandidate) => void;
  onScheduleMicroStep: (stepText: string, minutes: number) => void;
}

export const CognitiveSummaryCard: React.FC<CognitiveSummaryCardProps> = ({
  candidate,
  onCommitToSchedule,
  onScheduleMicroStep,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{candidate.title}</Text>
          <View style={styles.durationBadge}>
            <Text style={styles.durationBadgeText}>{candidate.estimatedMinutes}m</Text>
          </View>
        </View>
        <Text style={styles.categorySub}>
          Category: {candidate.category.toUpperCase()} | Due: {candidate.dueDate}
        </Text>
      </View>

      {/* 3-Sentence Cognitive Distillation */}
      <View style={styles.summaryBox}>
        <Text style={styles.boxTitle}>3-SENTENCE COGNITIVE SUMMARY</Text>
        <Text style={styles.summaryText}>{candidate.threeSentenceSummary}</Text>
      </View>

      {/* 15-Minute Micro-Step */}
      <View style={styles.microStepBox}>
        <View style={styles.microStepHeader}>
          <Text style={styles.microStepTitle}>IMMEDIATE 15-MINUTE MICRO-STEP</Text>
          <Text style={styles.microStepTime}>{candidate.immediateMicroStep.targetMinutes} MIN</Text>
        </View>
        <Text style={styles.microStepDesc}>{candidate.immediateMicroStep.action}</Text>

        <TouchableOpacity
          style={styles.microStepBtn}
          onPress={() =>
            onScheduleMicroStep(
              candidate.immediateMicroStep.action,
              candidate.immediateMicroStep.targetMinutes
            )
          }
        >
          <Text style={styles.microStepBtnText}>+ Push 15m Micro-Step to Timetable</Text>
        </TouchableOpacity>
      </View>

      {/* Commit Full Task */}
      <TouchableOpacity
        style={styles.fullTaskBtn}
        onPress={() => onCommitToSchedule(candidate)}
      >
        <Text style={styles.fullTaskBtnText}>
          Add Full Task ({candidate.estimatedMinutes}m) to Schedule
        </Text>
      </TouchableOpacity>
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
    gap: 12,
  },
  header: {
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221F1C',
    flex: 1,
    marginRight: 8,
  },
  durationBadge: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  durationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38332C',
  },
  categorySub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6459',
  },
  summaryBox: {
    backgroundColor: '#FAF8F4',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  boxTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  summaryText: {
    fontSize: 12,
    color: '#38332C',
    lineHeight: 18,
  },
  microStepBox: {
    backgroundColor: '#F2F8F5',
    borderWidth: 1,
    borderColor: '#C2DFD2',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  microStepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  microStepTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#2C6442',
  },
  microStepTime: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2C6442',
  },
  microStepDesc: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E432C',
    lineHeight: 16,
  },
  microStepBtn: {
    backgroundColor: '#4C7A67',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  microStepBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullTaskBtn: {
    backgroundColor: '#221F1C',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  fullTaskBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
