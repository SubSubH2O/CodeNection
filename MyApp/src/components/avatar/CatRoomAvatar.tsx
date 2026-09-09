import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CatAvatarState } from '../../types/avatar';

interface CatRoomAvatarProps {
  catState: CatAvatarState;
  petName: string;
}

export const CatRoomAvatar: React.FC<CatRoomAvatarProps> = ({ catState, petName }) => {
  const corners = Object.values(catState.corners);

  return (
    <View style={styles.container}>
      {/* Central Cat Companion Box */}
      <View style={styles.catCenterCard}>
        <View style={styles.catAvatarCircle}>
          <View style={styles.catEarsRow}>
            <View style={styles.catEarLeft} />
            <View style={styles.catEarRight} />
          </View>
          <View style={styles.catHead}>
            <View style={styles.catEyesRow}>
              <View style={styles.catEye} />
              <View style={styles.catEye} />
            </View>
            <View style={styles.catNose} />
          </View>
        </View>

        <View style={styles.catMetaCol}>
          <View style={styles.catTitleRow}>
            <Text style={styles.petNameText}>{petName}</Text>
            {catState.posture.isWearingPajamas && (
              <View style={styles.pajamaBadge}>
                <Text style={styles.pajamaText}>PAJAMAS ON</Text>
              </View>
            )}
          </View>
          <Text style={styles.moodSubText}>{catState.posture.moodText}</Text>
          <Text style={styles.activityText}>{catState.posture.activityDescription}</Text>
        </View>
      </View>

      {/* 5 Room Corners */}
      <View style={styles.cornersGrid}>
        {corners.map((c) => (
          <View
            key={c.dimension}
            style={[
              styles.cornerCard,
              c.status === 'red' && styles.cornerCardRed,
              c.status === 'yellow' && styles.cornerCardYellow,
            ]}
          >
            <View style={styles.cornerHead}>
              <Text style={styles.cornerName}>{c.cornerName}</Text>
              <Text
                style={[
                  styles.cornerPercent,
                  { color: c.status === 'red' ? '#C44D56' : c.status === 'yellow' ? '#C98A3B' : '#4C7A67' },
                ]}
              >
                {c.load}%
              </Text>
            </View>
            <Text style={styles.cornerDesc}>{c.description}</Text>
          </View>
        ))}
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
  catCenterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F6F1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  catAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#322D29',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catEarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 32,
    position: 'absolute',
    top: 4,
  },
  catEarLeft: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E6A69B',
    transform: [{ rotate: '-20deg' }],
  },
  catEarRight: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E6A69B',
    transform: [{ rotate: '20deg' }],
  },
  catHead: {
    alignItems: 'center',
    marginTop: 10,
  },
  catEyesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catEye: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8B86D',
  },
  catNose: {
    width: 3,
    height: 3,
    backgroundColor: '#E6A69B',
    marginTop: 2,
  },
  catMetaCol: {
    flex: 1,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  petNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#221F1C',
  },
  pajamaBadge: {
    backgroundColor: '#7A9A8B',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  pajamaText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moodSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6459',
    marginTop: 1,
  },
  activityText: {
    fontSize: 11,
    color: '#4A443B',
    marginTop: 4,
  },
  cornersGrid: {
    gap: 8,
  },
  cornerCard: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  cornerCardYellow: {
    borderColor: '#F0DEC2',
    backgroundColor: '#FFFDF7',
  },
  cornerCardRed: {
    borderColor: '#F3DED8',
    backgroundColor: '#FDF7F5',
  },
  cornerHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cornerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#221F1C',
  },
  cornerPercent: {
    fontSize: 12,
    fontWeight: '700',
  },
  cornerDesc: {
    fontSize: 11,
    color: '#6B6459',
    marginTop: 2,
  },
});
