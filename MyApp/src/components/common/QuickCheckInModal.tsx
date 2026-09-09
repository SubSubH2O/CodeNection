import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { loadActions, useCheckIn } from '../../store/useLoadStore';

interface QuickCheckInModalProps {
  visible: boolean;
  onClose: () => void;
}

export const QuickCheckInModal: React.FC<QuickCheckInModalProps> = ({ visible, onClose }) => {
  const current = useCheckIn();
  const [mood, setMood] = useState<number>(current.moodScore);
  const [sleep, setSleep] = useState<number>(current.sleepQuality);
  const [social, setSocial] = useState<number>(current.socialDrain);

  const handleSave = () => {
    loadActions.updateCheckIn({
      moodScore: mood,
      sleepQuality: sleep,
      socialDrain: social,
    });
    onClose();
  };

  const renderRatingRow = (
    label: string,
    currentVal: number,
    setter: (val: number) => void,
    lowLabel: string,
    highLabel: string
  ) => (
    <View style={styles.metricGroup}>
      <View style={styles.metricHeader}>
        <Text style={styles.metricTitle}>{label}</Text>
        <Text style={styles.metricValText}>Level {currentVal}</Text>
      </View>
      <View style={styles.buttonRow}>
        {[1, 2, 3, 4, 5].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.ratingBtn, currentVal === val && styles.ratingBtnActive]}
            onPress={() => setter(val)}
          >
            <Text style={[styles.ratingBtnText, currentVal === val && styles.ratingBtnTextActive]}>
              {val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.anchorRow}>
        <Text style={styles.anchorText}>{lowLabel}</Text>
        <Text style={styles.anchorText}>{highLabel}</Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Daily Biometric & Mental Check-In</Text>
            <Text style={styles.subtitle}>Self-reported baseline calibration. Non-judgmental.</Text>
          </View>

          {renderRatingRow('Mental & Mood Strain', mood, setMood, 'Refreshed', 'Severe Strain')}
          {renderRatingRow('Sleep Deprivation Level', sleep, setSleep, 'Fully Rested', 'Deep Deficit')}
          {renderRatingRow('Social Energy Drain', social, setSocial, 'High Energy', 'Depleted')}

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Check-In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 25, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FAF8F4',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#221F1C',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B6459',
  },
  metricGroup: {
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#38332C',
  },
  metricValText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5FA8',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 6,
  },
  ratingBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBtnActive: {
    backgroundColor: '#221F1C',
    borderColor: '#221F1C',
  },
  ratingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A443B',
  },
  ratingBtnTextActive: {
    color: '#FAF8F4',
  },
  anchorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  anchorText: {
    fontSize: 10,
    color: '#8A8275',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B6459',
  },
  saveBtn: {
    backgroundColor: '#4C7A67',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
