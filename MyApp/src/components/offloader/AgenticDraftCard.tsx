import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { OffloadedDocument } from '../../types/offloader';
import { defaultOffloaderEngine } from '../../core/offloader/offloaderEngine';

interface AgenticDraftCardProps {
  document: OffloadedDocument;
}

export const AgenticDraftCard: React.FC<AgenticDraftCardProps> = ({ document }) => {
  const [qaQuery, setQaQuery] = useState('');
  const [qaAnswer, setQaAnswer] = useState<string | null>(null);

  const handleAsk = () => {
    if (!qaQuery.trim()) return;
    const ans = defaultOffloaderEngine.askDocumentQuestion(document.id, qaQuery);
    setQaAnswer(ans);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.badgePill}>
          <Text style={styles.badgePillText}>AGENTIC OFFLOADER</Text>
        </View>
        <Text style={styles.title}>{document.starterDraft.title}</Text>
        <Text style={styles.sub}>
          First 30% of scaffolding generated to eliminate cold-start resistance.
        </Text>
      </View>

      {/* Structured Outline / Mindmap Skeleton */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>STRUCTURED RECONSTITUTION (SKELETON)</Text>
        <View style={styles.outlineList}>
          {document.starterDraft.outline.map((item, idx) => (
            <View key={idx} style={styles.outlineItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.outlineText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 30% Opening Draft Template */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionHeader}>GENERATED 30% FIRST DRAFT (READY TO EDIT)</Text>
        <View style={styles.draftSnippet}>
          <Text style={styles.draftText}>{document.starterDraft.openingDraft}</Text>
        </View>
      </View>

      {/* Document Q&A */}
      <View style={styles.qaBox}>
        <Text style={styles.sectionHeader}>DOCUMENT INQUIRY (OFFLOADED Q&A)</Text>
        <View style={styles.qaRow}>
          <TextInput
            style={styles.qaInput}
            placeholder="Ask about DDL, scope, or next step..."
            placeholderTextColor="#A8A297"
            value={qaQuery}
            onChangeText={setQaQuery}
          />
          <TouchableOpacity style={styles.askBtn} onPress={handleAsk}>
            <Text style={styles.askBtnText}>Ask</Text>
          </TouchableOpacity>
        </View>
        {qaAnswer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerText}>{qaAnswer}</Text>
          </View>
        )}
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
    gap: 12,
  },
  header: {
    gap: 4,
  },
  badgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAE6F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B5FA8',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221F1C',
  },
  sub: {
    fontSize: 12,
    color: '#6B6459',
  },
  sectionBox: {
    backgroundColor: '#FAF8F4',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  sectionHeader: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8A8275',
  },
  outlineList: {
    gap: 4,
  },
  outlineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bulletDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6B5FA8',
  },
  outlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#38332C',
  },
  draftSnippet: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFECE6',
    borderRadius: 8,
    padding: 10,
  },
  draftText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#4A443B',
    lineHeight: 16,
  },
  qaBox: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    paddingTop: 8,
  },
  qaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  qaInput: {
    flex: 1,
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: '#221F1C',
  },
  askBtn: {
    backgroundColor: '#221F1C',
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  answerBox: {
    backgroundColor: '#F2EEF8',
    borderRadius: 8,
    padding: 10,
  },
  answerText: {
    fontSize: 11,
    color: '#573E7A',
    lineHeight: 16,
  },
});
