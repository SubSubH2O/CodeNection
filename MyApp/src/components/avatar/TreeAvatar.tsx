import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TreeAvatarState } from '../../types/avatar';
import { LoadDimension } from '../../types/load';

interface TreeAvatarProps {
  treeState: TreeAvatarState;
}

export const TreeAvatar: React.FC<TreeAvatarProps> = ({ treeState }) => {
  const branches = Object.values(treeState.branches);

  return (
    <View style={styles.container}>
      <View style={styles.treeTrunkVisual}>
        <View style={styles.treeCrown}>
          {branches.map((b) => (
            <View
              key={b.dimension}
              style={[
                styles.branchBadge,
                {
                  borderColor: b.colorHex,
                  backgroundColor: b.status === 'red' ? '#FDF2F0' : b.status === 'yellow' ? '#FFFDF5' : '#F2F8F5',
                  transform: b.isDrooping ? [{ translateY: 6 }] : [{ translateY: 0 }],
                },
              ]}
            >
              <View style={[styles.branchIndicatorDot, { backgroundColor: b.colorHex }]} />
              <View style={styles.branchTextCol}>
                <View style={styles.branchHeaderRow}>
                  <Text style={styles.branchName}>{b.label}</Text>
                  <Text style={[styles.branchPercent, { color: b.colorHex }]}>{b.load}%</Text>
                </View>
                <Text style={styles.branchSub}>
                  {b.isDrooping ? 'Drooping - Overloaded' : b.isBlooming ? 'Blooming - Balanced' : 'Normal Branch'}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.trunkStem}>
          <View style={styles.barkLine} />
        </View>
        <View style={styles.rootBase}>
          <Text style={styles.rootText}>5-DIMENSION REVERSIBLE MIRROR</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    marginVertical: 10,
  },
  treeTrunkVisual: {
    alignItems: 'center',
  },
  treeCrown: {
    width: '100%',
    gap: 8,
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  branchIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  branchTextCol: {
    flex: 1,
  },
  branchHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  branchName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#221F1C',
  },
  branchPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  branchSub: {
    fontSize: 11,
    color: '#6B6459',
    marginTop: 2,
  },
  trunkStem: {
    width: 24,
    height: 28,
    backgroundColor: '#8B7355',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barkLine: {
    width: 2,
    height: 20,
    backgroundColor: '#6D5940',
  },
  rootBase: {
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 12,
    backgroundColor: '#EDE8DF',
    borderRadius: 12,
  },
  rootText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#5C5449',
  },
});
