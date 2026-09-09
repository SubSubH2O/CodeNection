import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { TodayScreen } from './src/screens/TodayScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { OffloaderScreen } from './src/screens/OffloaderScreen';
import { CoopScreen } from './src/screens/CoopScreen';
import { SoundingBoardModal } from './src/components/soundingBoard/SoundingBoardModal';
import { useLoadMetrics } from './src/store/useLoadStore';
import { BotanicalTokens } from './src/theme/tokens';

type Tab = 'today' | 'timetable' | 'offloader' | 'coop';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [soundingBoardOpen, setSoundingBoardOpen] = useState(false);

  const metrics = useLoadMetrics();
  const vitalityPercent = 100 - Math.round(metrics.overall * 0.4);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        <View style={styles.appContainer}>
        {/* Stitch Header Bar */}
        <View style={styles.appHeader}>
          <View style={styles.headerBrandCol}>
            <View style={styles.brandIconWrap}>
              <Text style={styles.brandEmoji}>🌱</Text>
            </View>
            <View>
              <Text style={styles.brandTitle}>Sprout Equilibrium</Text>
              <View style={styles.brandSubRow}>
                <View style={styles.activePulseDot} />
                <Text style={styles.brandSub}>
                  {activeTab === 'today'
                    ? 'Garden Tree'
                    : activeTab === 'timetable'
                    ? 'Timetable'
                    : activeTab === 'offloader'
                    ? 'Scanner'
                    : 'Co-op Grove'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {/* Water Drop Vitality Pill */}
            <View style={styles.vitalityDropPill}>
              <Text style={styles.waterDropIcon}>💧</Text>
              <Text style={styles.vitalityNumber}>{vitalityPercent}%</Text>
            </View>

            {/* Sounding Board Pill Button */}
            <TouchableOpacity
              style={styles.soundingBoardBtn}
              onPress={() => setSoundingBoardOpen(true)}
            >
              <Text style={styles.soundingBoardText}>🧘 Tea Room</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Container */}
        <View style={styles.screenContainer}>
          {activeTab === 'today' && (
            <TodayScreen onOpenSoundingBoard={() => setSoundingBoardOpen(true)} />
          )}
          {activeTab === 'timetable' && <TimetableScreen />}
          {activeTab === 'offloader' && <OffloaderScreen />}
          {activeTab === 'coop' && <CoopScreen />}
        </View>

        {/* Stitch Rounded Bottom Navigation Bar */}
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={[styles.navItem, activeTab === 'today' && styles.navItemActive]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={styles.navIcon}>🪴</Text>
            <Text style={[styles.navLabel, activeTab === 'today' && styles.navLabelActive]}>
              Garden Tree
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'timetable' && styles.navItemActive]}
            onPress={() => setActiveTab('timetable')}
          >
            <Text style={styles.navIcon}>📅</Text>
            <Text style={[styles.navLabel, activeTab === 'timetable' && styles.navLabelActive]}>
              Timetable
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'offloader' && styles.navItemActive]}
            onPress={() => setActiveTab('offloader')}
          >
            <Text style={styles.navIcon}>🧠</Text>
            <Text style={[styles.navLabel, activeTab === 'offloader' && styles.navLabelActive]}>
              Offloader
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navItem, activeTab === 'coop' && styles.navItemActive]}
            onPress={() => setActiveTab('coop')}
          >
            <Text style={styles.navIcon}>🌸</Text>
            <Text style={[styles.navLabel, activeTab === 'coop' && styles.navLabelActive]}>
              Co-op Grove
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sounding Board Modal */}
        <SoundingBoardModal
          visible={soundingBoardOpen}
          onClose={() => setSoundingBoardOpen(false)}
        />
      </View>
    </SafeAreaView>
  </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.background,
  },
  appContainer: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.backgroundCanvas,
  },
  appHeader: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(235, 220, 203, 0.7)',
    ...BotanicalTokens.shadows.soft,
  },
  headerBrandCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(9, 100, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 16,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  brandSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activePulseDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: BotanicalTokens.colors.primary,
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: BotanicalTokens.colors.primary,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vitalityDropPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BotanicalTokens.radii.full,
    gap: 3,
  },
  waterDropIcon: {
    fontSize: 12,
  },
  vitalityNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  soundingBoardBtn: {
    backgroundColor: 'rgba(9, 100, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(9, 100, 68, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BotanicalTokens.radii.full,
  },
  soundingBoardText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.primary,
  },
  screenContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(235, 220, 203, 0.8)',
    paddingHorizontal: 10,
    ...BotanicalTokens.shadows.card,
  },
  navItem: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BotanicalTokens.radii.full,
    gap: 2,
  },
  navItemActive: {
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(235, 220, 203, 0.6)',
    ...BotanicalTokens.shadows.soft,
  },
  navIcon: {
    fontSize: 16,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  navLabelActive: {
    color: BotanicalTokens.colors.primary,
    fontWeight: '800',
  },
});
