import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLoadMetrics } from '../store/useLoadStore';
import { useSelectedDate } from '../store/useTaskStore';
import { AvatarContainer } from '../components/avatar/AvatarContainer';
import { LoadBarGroup } from '../components/common/LoadBarGroup';
import { QuickCheckInModal } from '../components/common/QuickCheckInModal';

interface TodayScreenProps {
  onOpenSoundingBoard: () => void;
}

export const TodayScreen: React.FC<TodayScreenProps> = ({ onOpenSoundingBoard }) => {
  const [checkInVisible, setCheckInVisible] = useState(false);
  const metrics = useLoadMetrics();
  const selectedDate = useSelectedDate();

  const getStatusColor = () => {
    switch (metrics.status) {
      case 'red':
        return '#C44D56';
      case 'yellow':
        return '#C98A3B';
      default:
        return '#4C7A67';
    }
  };

  const getStatusBg = () => {
    switch (metrics.status) {
      case 'red':
        return '#FDF2F0';
      case 'yellow':
        return '#FFFDF5';
      default:
        return '#F2F8F5';
    }
  };

  const getStatusDescription = () => {
    if (metrics.status === 'red') {
      return `Critical load threshold exceeded (${metrics.overall}%). Primary strain: ${metrics.primaryStressDimension.toUpperCase()}. Circuit Breaker active.`;
    }
    if (metrics.status === 'yellow') {
      return `Operating near heavy capacity (${metrics.overall}%). Primary load driven by ${metrics.primaryStressDimension}. Regular recovery breaks suggested.`;
    }
    return `Operating within healthy equilibrium (${metrics.overall}%). Capacity well-distributed.`;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CURRENT STATUS</Text>
          <Text style={styles.dateTitle}>{selectedDate}</Text>
        </View>
        <TouchableOpacity style={styles.checkInPill} onPress={() => setCheckInVisible(true)}>
          <Text style={styles.checkInPillText}>Daily Calibration</Text>
        </TouchableOpacity>
      </View>

      {/* Overall Load Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: getStatusBg(), borderColor: getStatusColor() }]}>
        <View style={styles.summaryTopRow}>
          <View>
            <Text style={styles.summaryLabel}>COMBINED LIFE LOAD</Text>
            <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
              {metrics.status.toUpperCase()} ZONE ({metrics.overall}%)
            </Text>
          </View>
          <View style={[styles.ringBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.ringBadgeText}>{metrics.overall}%</Text>
          </View>
        </View>
        <Text style={styles.summaryDesc}>{getStatusDescription()}</Text>
      </View>

      {/* Warning Forecast Banner */}
      {metrics.overall >= 75 && (
        <View style={styles.forecastBanner}>
          <View style={styles.forecastDot} />
          <Text style={styles.forecastText}>
            Forward projection: consecutive workload spikes may trigger saturation by midweek.
          </Text>
        </View>
      )}

      {/* Dynamic Avatar Mirror (Tree or Cat) */}
      <AvatarContainer load={metrics.dimensions} overallStatus={metrics.status} />

      {/* 5-Dimension Load Breakdown */}
      <LoadBarGroup dimensions={metrics.dimensions} />

      {/* Bottom Action Triggers */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.destressBtn} onPress={onOpenSoundingBoard}>
          <Text style={styles.destressBtnText}>Open Sounding Board</Text>
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
    backgroundColor: '#FAF8F4',
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  dateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#221F1C',
  },
  checkInPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  checkInPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38332C',
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#6B6459',
  },
  statusBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  ringBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryDesc: {
    fontSize: 12,
    color: '#4A443B',
    lineHeight: 16,
  },
  forecastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  forecastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EA580C',
  },
  forecastText: {
    flex: 1,
    fontSize: 11,
    color: '#9A3412',
    lineHeight: 15,
  },
  actionRow: {
    marginTop: 4,
  },
  destressBtn: {
    backgroundColor: '#6B5FA8',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  destressBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
