import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FiveDimensionLoad, LoadStatus } from '../../types/load';

interface CapacitySidebarProps {
  overall: number;
  status: LoadStatus;
  dimensions: FiveDimensionLoad;
}

export const CapacitySidebar: React.FC<CapacitySidebarProps> = ({
  overall,
  status,
  dimensions,
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'red':
        return '#C44D56';
      case 'yellow':
        return '#C98A3B';
      default:
        return '#4C7A67';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sidebarTitle}>LOAD METER</Text>

      {/* Main Meter Gauge */}
      <View style={styles.meterBox}>
        <View style={styles.track}>
          <View
            style={[
              styles.meterFill,
              {
                height: `${Math.min(100, Math.max(0, overall))}%`,
                backgroundColor: getStatusColor(),
              },
            ]}
          />
        </View>
        <Text style={[styles.meterNumber, { color: getStatusColor() }]}>{overall}%</Text>
      </View>

      {/* Mini dots for 5 dimensions */}
      <View style={styles.miniList}>
        <View style={styles.miniItem}>
          <Text style={styles.miniKey}>T</Text>
          <View style={[styles.miniDot, { backgroundColor: '#3E6E8E' }]} />
        </View>
        <View style={styles.miniItem}>
          <Text style={styles.miniKey}>M</Text>
          <View style={[styles.miniDot, { backgroundColor: '#8B5E83' }]} />
        </View>
        <View style={styles.miniItem}>
          <Text style={styles.miniKey}>P</Text>
          <View style={[styles.miniDot, { backgroundColor: '#4C7A67' }]} />
        </View>
        <View style={styles.miniItem}>
          <Text style={styles.miniKey}>S</Text>
          <View style={[styles.miniDot, { backgroundColor: '#5E6FA3' }]} />
        </View>
        <View style={styles.miniItem}>
          <Text style={styles.miniKey}>E</Text>
          <View style={[styles.miniDot, { backgroundColor: '#A98B4A' }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 8,
  },
  sidebarTitle: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: '#8A8275',
    textAlign: 'center',
  },
  meterBox: {
    alignItems: 'center',
    gap: 4,
  },
  track: {
    width: 14,
    height: 100,
    backgroundColor: '#EFECE6',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  meterFill: {
    width: '100%',
    borderRadius: 7,
  },
  meterNumber: {
    fontSize: 12,
    fontWeight: '800',
  },
  miniList: {
    gap: 6,
    marginTop: 4,
  },
  miniItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniKey: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B6459',
    width: 10,
    textAlign: 'center',
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
