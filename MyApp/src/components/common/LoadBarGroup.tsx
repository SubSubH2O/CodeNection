import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FiveDimensionLoad, LoadDimension } from '../../types/load';

interface LoadBarGroupProps {
  dimensions: FiveDimensionLoad;
}

const DIMENSION_CONFIG: { key: LoadDimension; label: string; color: string }[] = [
  { key: 'time', label: 'Time Load', color: '#3E6E8E' },
  { key: 'mental', label: 'Mental Load', color: '#8B5E83' },
  { key: 'physical', label: 'Physical Load', color: '#4C7A67' },
  { key: 'social', label: 'Social Battery', color: '#5E6FA3' },
  { key: 'errands', label: 'Errands Pressure', color: '#A98B4A' },
];

export const LoadBarGroup: React.FC<LoadBarGroupProps> = ({ dimensions }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>5-DIMENSION BREAKDOWN</Text>
      <View style={styles.barList}>
        {DIMENSION_CONFIG.map((dim) => {
          const val = dimensions[dim.key];
          return (
            <View key={dim.key} style={styles.barRow}>
              <View style={styles.labelCol}>
                <Text style={styles.barLabel}>{dim.label}</Text>
                <Text style={[styles.barValue, { color: dim.color }]}>{val}%</Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    {
                      width: `${Math.min(100, Math.max(0, val))}%`,
                      backgroundColor: dim.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
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
    marginVertical: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8A8275',
    marginBottom: 12,
  },
  barList: {
    gap: 10,
  },
  barRow: {
    gap: 4,
  },
  labelCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#38332C',
  },
  barValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 8,
    backgroundColor: '#EFECE6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
