import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useLoadMetrics } from '../../store/useLoadStore';
import { getRecommendedDeStressActions } from '../../core/soundingBoard/soundingBoardEngine';
import { BreathingWidget } from './BreathingWidget';
import { DeStressAction } from '../../types/soundingBoard';

interface SoundingBoardModalProps {
  visible: boolean;
  onClose: () => void;
}

export const SoundingBoardModal: React.FC<SoundingBoardModalProps> = ({ visible, onClose }) => {
  const metrics = useLoadMetrics();
  const [ventingText, setVentingText] = useState('');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const actions = getRecommendedDeStressActions(metrics.primaryStressDimension);

  const renderActionCard = (act: DeStressAction) => {
    if (act.type === 'box_breathing') {
      return <BreathingWidget key={act.id} />;
    }

    return (
      <View key={act.id} style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <Text style={styles.actionTitle}>{act.title}</Text>
          <Text style={styles.actionDuration}>{act.durationMinutes}m action</Text>
        </View>
        <Text style={styles.actionInstruction}>{act.instruction}</Text>

        {act.payload?.emailBody && (
          <View style={styles.emailBox}>
            {act.payload.emailSubject && (
              <Text style={styles.emailSubject}>Subj: {act.payload.emailSubject}</Text>
            )}
            <Text style={styles.emailBodyText}>{act.payload.emailBody}</Text>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={() => {
                setCopiedNotice(`"${act.title}" script copied to clipboard.`);
                setTimeout(() => setCopiedNotice(null), 2500);
              }}
            >
              <Text style={styles.copyBtnText}>Copy Script to Clipboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.tagRow}>
              <Text style={styles.eyebrow}>SOUNDING BOARD</Text>
              <Text style={styles.ethicsTag}>NON-CLINICAL DECOMPRESSION</Text>
            </View>
            <Text style={styles.title}>Emotional Triage & Action</Text>
            <Text style={styles.disclaimer}>
              Objective de-escalation space. Not a psychiatric or medical diagnostic service.
            </Text>
          </View>

          {copiedNotice && (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{copiedNotice}</Text>
            </View>
          )}

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Pressure analysis badge */}
            <View style={styles.analysisCard}>
              <Text style={styles.analysisLabel}>CURRENT PRIMARY PRESSURE VECTOR</Text>
              <Text style={styles.analysisValue}>
                {metrics.primaryStressDimension.toUpperCase()} LOAD ({metrics.dimensions[metrics.primaryStressDimension]}%)
              </Text>
              <Text style={styles.analysisDesc}>
                Interventions below are automatically tuned to relieve strain on this specific dimension.
              </Text>
            </View>

            {/* Venting text area */}
            <View style={styles.ventArea}>
              <Text style={styles.ventLabel}>SAFE VENTING NOTEBOOK (PRIVATE)</Text>
              <TextInput
                style={styles.ventInput}
                multiline
                placeholder="Type raw thoughts, frustrations, or fatigue symptoms here..."
                placeholderTextColor="#A8A297"
                value={ventingText}
                onChangeText={setVentingText}
              />
            </View>

            {/* Generated actionable recommendations */}
            <Text style={styles.sectionHeader}>IMMEDIATE COPING ACTIONS:</Text>
            {actions.map(renderActionCard)}
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Return to Overview</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 25, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FAF8F4',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    padding: 20,
    gap: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DCD6CB',
    alignSelf: 'center',
  },
  header: {
    gap: 2,
  },
  tagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6B5FA8',
  },
  ethicsTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8275',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#221F1C',
  },
  disclaimer: {
    fontSize: 11,
    color: '#8A8275',
  },
  noticeBox: {
    backgroundColor: '#F2F8F5',
    borderWidth: 1,
    borderColor: '#C2DFD2',
    padding: 8,
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2C6442',
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: 450,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 16,
  },
  analysisCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  analysisLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#C44D56',
  },
  analysisDesc: {
    fontSize: 11,
    color: '#6B6459',
  },
  ventArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  ventLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  ventInput: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#221F1C',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#5C5449',
    marginTop: 4,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#221F1C',
  },
  actionDuration: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5FA8',
  },
  actionInstruction: {
    fontSize: 11,
    color: '#6B6459',
    lineHeight: 15,
  },
  emailBox: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 8,
    padding: 10,
    gap: 6,
    marginTop: 4,
  },
  emailSubject: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38332C',
  },
  emailBodyText: {
    fontSize: 11,
    color: '#4A443B',
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  copyBtn: {
    backgroundColor: '#221F1C',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 12,
    backgroundColor: '#EBE7DE',
    borderRadius: 10,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38332C',
  },
});
