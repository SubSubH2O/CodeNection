import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type BreathingPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Rest';

export const BreathingWidget: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(120); // 2 minutes
  const [phase, setPhase] = useState<BreathingPhase>('Inhale');
  const [phaseSeconds, setPhaseSeconds] = useState(4);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isActive && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => Math.max(0, prev - 1));

        setPhaseSeconds((prev) => {
          if (prev <= 1) {
            setPhase((currentPhase) => {
              switch (currentPhase) {
                case 'Inhale':
                  return 'Hold';
                case 'Hold':
                  return 'Exhale';
                case 'Exhale':
                  return 'Rest';
                case 'Rest':
                  return 'Inhale';
              }
            });
            return 4;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsRemaining === 0) {
      setIsActive(false);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, secondsRemaining]);

  const toggleSession = () => {
    if (secondsRemaining === 0) {
      setSecondsRemaining(120);
      setPhase('Inhale');
      setPhaseSeconds(4);
    }
    setIsActive((prev) => !prev);
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'Inhale':
        return '#4C7A67';
      case 'Hold':
        return '#6B5FA8';
      case 'Exhale':
        return '#3E6E8E';
      case 'Rest':
        return '#8A8275';
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>2-MINUTE BOX BREATHING</Text>
        <Text style={styles.timer}>{formattedTime}</Text>
      </View>

      {/* Visual Breathing Bubble */}
      <View style={styles.bubbleArea}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: getPhaseColor(),
              transform: [
                {
                  scale: phase === 'Inhale' || phase === 'Hold' ? 1.15 : 0.88,
                },
              ],
            },
          ]}
        >
          <Text style={styles.phaseName}>{phase.toUpperCase()}</Text>
          <Text style={styles.phaseCount}>{phaseSeconds}s</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.btn, { backgroundColor: isActive ? '#C44D56' : '#221F1C' }]}
        onPress={toggleSession}
      >
        <Text style={styles.btnText}>{isActive ? 'Pause Session' : 'Start 2-Min Reset'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FAF8F4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6B6459',
  },
  timer: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'monospace',
    color: '#221F1C',
  },
  bubbleArea: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  phaseName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  phaseCount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
