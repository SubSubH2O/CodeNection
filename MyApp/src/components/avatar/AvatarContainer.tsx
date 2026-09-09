import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FiveDimensionLoad, LoadStatus } from '../../types/load';
import { mapToCatAvatar, mapToTreeAvatar } from '../../core/avatar/avatarMapper';
import { TreeAvatar } from './TreeAvatar';
import { CatRoomAvatar } from './CatRoomAvatar';
import { useActiveAvatar, usePetName, avatarActions } from '../../store/useAvatarStore';

interface AvatarContainerProps {
  load: FiveDimensionLoad;
  overallStatus: LoadStatus;
}

export const AvatarContainer: React.FC<AvatarContainerProps> = ({ load, overallStatus }) => {
  const activeAvatar = useActiveAvatar();
  const petName = usePetName();

  const treeState = mapToTreeAvatar(load, overallStatus);
  const catState = mapToCatAvatar(load, overallStatus);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>DYNAMIC MIRROR</Text>
          <Text style={styles.headerTitle}>
            {activeAvatar === 'tree' ? '5-Branch Growth Mirror' : `${petName}'s Living Space`}
          </Text>
        </View>

        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, activeAvatar === 'tree' && styles.toggleBtnActive]}
            onPress={() => avatarActions.setAvatar('tree')}
          >
            <Text style={[styles.toggleBtnText, activeAvatar === 'tree' && styles.toggleBtnTextActive]}>
              Tree
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, activeAvatar === 'cat' && styles.toggleBtnActive]}
            onPress={() => avatarActions.setAvatar('cat')}
          >
            <Text style={[styles.toggleBtnText, activeAvatar === 'cat' && styles.toggleBtnTextActive]}>
              Cat
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeAvatar === 'tree' ? (
        <TreeAvatar treeState={treeState} />
      ) : (
        <CatRoomAvatar catState={catState} petName={petName} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#221F1C',
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#EBE7DE',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6459',
  },
  toggleBtnTextActive: {
    color: '#221F1C',
  },
});
