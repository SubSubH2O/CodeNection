import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { TodayScreen } from './src/screens/TodayScreen';
import { TimetableScreen } from './src/screens/TimetableScreen';
import { OffloaderScreen } from './src/screens/OffloaderScreen';
import { CoopScreen } from './src/screens/CoopScreen';
import { SoundingBoardModal } from './src/components/soundingBoard/SoundingBoardModal';

type Tab = 'today' | 'timetable' | 'offloader' | 'coop';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [soundingBoardOpen, setSoundingBoardOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appContainer}>
        {/* App Title Header */}
        <View style={styles.appBar}>
          <View>
            <Text style={styles.appBrand}>EQUILIBRIUM</Text>
            <Text style={styles.appTagline}>Burnout Prevention & Task Decoupling</Text>
          </View>
          <TouchableOpacity
            style={styles.soundingBoardPill}
            onPress={() => setSoundingBoardOpen(true)}
          >
            <Text style={styles.soundingBoardPillText}>Sounding Board</Text>
          </TouchableOpacity>
        </View>

        {/* Screen View Container */}
        <View style={styles.screenContainer}>
          {activeTab === 'today' && (
            <TodayScreen onOpenSoundingBoard={() => setSoundingBoardOpen(true)} />
          )}
          {activeTab === 'timetable' && <TimetableScreen />}
          {activeTab === 'offloader' && <OffloaderScreen />}
          {activeTab === 'coop' && <CoopScreen />}
        </View>

        {/* Bottom Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'today' && styles.tabItemActive]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.tabLabel, activeTab === 'today' && styles.tabLabelActive]}>
              Today
            </Text>
            <Text style={[styles.tabSub, activeTab === 'today' && styles.tabSubActive]}>
              Mirror
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'timetable' && styles.tabItemActive]}
            onPress={() => setActiveTab('timetable')}
          >
            <Text style={[styles.tabLabel, activeTab === 'timetable' && styles.tabLabelActive]}>
              Timetable
            </Text>
            <Text style={[styles.tabSub, activeTab === 'timetable' && styles.tabSubActive]}>
              Schedule
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'offloader' && styles.tabItemActive]}
            onPress={() => setActiveTab('offloader')}
          >
            <Text style={[styles.tabLabel, activeTab === 'offloader' && styles.tabLabelActive]}>
              Offloader
            </Text>
            <Text style={[styles.tabSub, activeTab === 'offloader' && styles.tabSubActive]}>
              Scanner
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'coop' && styles.tabItemActive]}
            onPress={() => setActiveTab('coop')}
          >
            <Text style={[styles.tabLabel, activeTab === 'coop' && styles.tabLabelActive]}>
              Co-op
            </Text>
            <Text style={[styles.tabSub, activeTab === 'coop' && styles.tabSubActive]}>
              Circle
            </Text>
          </TouchableOpacity>
        </View>

        {/* De-escalation & Emotional Triage Sounding Board */}
        <SoundingBoardModal
          visible={soundingBoardOpen}
          onClose={() => setSoundingBoardOpen(false)}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight || 24 : 0,
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6E1D8',
    backgroundColor: '#FAF8F4',
  },
  appBrand: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#221F1C',
  },
  appTagline: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8A8275',
  },
  soundingBoardPill: {
    backgroundColor: '#F2EEF8',
    borderWidth: 1,
    borderColor: '#D3C6E8',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  soundingBoardPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5FA8',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6E1D8',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: '#F5F2EB',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8275',
  },
  tabLabelActive: {
    color: '#221F1C',
  },
  tabSub: {
    fontSize: 9,
    fontWeight: '600',
    color: '#A8A297',
    marginTop: 1,
  },
  tabSubActive: {
    color: '#6B6459',
  },
});
