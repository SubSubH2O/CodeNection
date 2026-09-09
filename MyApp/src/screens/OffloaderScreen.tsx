import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { LoadScannerInput } from '../components/offloader/LoadScannerInput';
import { CognitiveSummaryCard } from '../components/offloader/CognitiveSummaryCard';
import { AgenticDraftCard } from '../components/offloader/AgenticDraftCard';
import { defaultOffloaderEngine } from '../core/offloader/offloaderEngine';
import { ExtractedTaskCandidate, OffloadedDocument, ScannerInputType } from '../types/offloader';
import { taskActions, useSelectedDate } from '../store/useTaskStore';
import { Task } from '../types/task';

export const OffloaderScreen: React.FC = () => {
  const selectedDate = useSelectedDate();
  const [candidate, setCandidate] = useState<ExtractedTaskCandidate | null>(null);
  const [document, setDocument] = useState<OffloadedDocument | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const handleScan = (text: string, type: ScannerInputType) => {
    const extracted = defaultOffloaderEngine.parseScannerInput(text, type);
    const doc = defaultOffloaderEngine.generateDraftAndMicroSteps(text, extracted.title);
    setCandidate(extracted);
    setDocument(doc);
    setFeedbackNotice(`Parsed "${extracted.title}" with estimated ${extracted.estimatedMinutes}m load.`);
  };

  const handleCommitToSchedule = (taskCandidate: ExtractedTaskCandidate) => {
    const newTask: Task = {
      id: `task-offload-${Date.now()}`,
      title: taskCandidate.title,
      category: taskCandidate.category,
      priority: 'high',
      isFlexible: true,
      durationMinutes: taskCandidate.estimatedMinutes,
      dueDate: taskCandidate.dueDate,
      scheduledDate: selectedDate,
      difficulty: taskCandidate.difficulty,
      milestones: [],
      completed: false,
      primaryDimension: 'mental',
    };
    taskActions.addTask(newTask);
    setFeedbackNotice(`Added "${newTask.title}" to timetable for ${selectedDate}.`);
  };

  const handleScheduleMicroStep = (stepText: string, minutes: number) => {
    const microTask: Task = {
      id: `micro-${Date.now()}`,
      title: `Micro-Step: ${stepText.slice(0, 35)}...`,
      category: 'coursework',
      priority: 'medium',
      isFlexible: true,
      durationMinutes: minutes,
      dueDate: selectedDate,
      scheduledDate: selectedDate,
      difficulty: 1,
      milestones: [],
      completed: false,
      primaryDimension: 'mental',
    };
    taskActions.addTask(microTask);
    setFeedbackNotice(`Scheduled 15-minute micro-step on ${selectedDate}.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>COGNITIVE & AGENTIC OFFLOADER</Text>
        <Text style={styles.dateTitle}>Zero-Resistance Onboarding</Text>
        <Text style={styles.sub}>
          Drop fragmented requirements. AI generates initial 30% drafts and minimal micro-steps.
        </Text>
      </View>

      {feedbackNotice && (
        <View style={styles.noticeBox}>
          <View style={styles.noticeDot} />
          <Text style={styles.noticeText}>{feedbackNotice}</Text>
        </View>
      )}

      {/* Input Scanner */}
      <LoadScannerInput onScan={handleScan} />

      {/* Cognitive 3-sentence summary & 15m step */}
      {candidate && (
        <CognitiveSummaryCard
          candidate={candidate}
          onCommitToSchedule={handleCommitToSchedule}
          onScheduleMicroStep={handleScheduleMicroStep}
        />
      )}

      {/* Agentic Skeleton & 30% first draft */}
      {document && <AgenticDraftCard document={document} />}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F4',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 2,
    marginTop: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#6B5FA8',
  },
  dateTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#221F1C',
  },
  sub: {
    fontSize: 12,
    color: '#6B6459',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAE6F5',
    borderWidth: 1,
    borderColor: '#D3C6E8',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  noticeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6B5FA8',
  },
  noticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#573E7A',
    flex: 1,
  },
});
