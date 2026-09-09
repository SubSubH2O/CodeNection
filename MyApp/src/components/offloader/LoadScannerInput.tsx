import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { ScannerInputType } from '../../types/offloader';

interface LoadScannerInputProps {
  onScan: (text: string, type: ScannerInputType) => void;
}

const SAMPLE_INPUTS = [
  {
    label: 'CS301 Syllabus PDF',
    type: 'document' as ScannerInputType,
    text: 'CS301 Algorithm Analysis Assignment 3: Dynamic Programming on Graph Networks. Due Friday 23:59. Estimated workload: 3 to 4 hours. Requires theoretical proofs and code submission.',
  },
  {
    label: 'Voice Note: Lab & Shift',
    type: 'voice_transcript' as ScannerInputType,
    text: 'Hey remember I have a 3 hour shift at the bookstore tomorrow afternoon and I need to finish the OS lab before Friday midnight.',
  },
];

export const LoadScannerInput: React.FC<LoadScannerInputProps> = ({ onScan }) => {
  const [inputText, setInputText] = useState('');

  const handleRunScan = (textToUse?: string, typeToUse?: ScannerInputType) => {
    const txt = textToUse !== undefined ? textToUse : inputText;
    const typ = typeToUse !== undefined ? typeToUse : 'text';
    if (!txt.trim()) return;
    onScan(txt, typ);
    if (textToUse === undefined) setInputText('');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>LOAD SCANNER</Text>
        <Text style={styles.title}>Multimodal Assignment Ingestion</Text>
        <Text style={styles.sub}>
          Drop unstructured syllabus text, voice transcripts, or task briefs.
        </Text>
      </View>

      <TextInput
        style={styles.inputArea}
        multiline
        placeholder="Paste task brief, syllabus section, or raw notes..."
        placeholderTextColor="#A8A297"
        value={inputText}
        onChangeText={setInputText}
      />

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.scanBtn, !inputText.trim() && styles.scanBtnDisabled]}
          disabled={!inputText.trim()}
          onPress={() => handleRunScan()}
        >
          <Text style={styles.scanBtnText}>Parse Workload & DDL</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.sampleSection}>
        <Text style={styles.sampleLabel}>QUICK SAMPLES:</Text>
        <View style={styles.sampleChips}>
          {SAMPLE_INPUTS.map((s, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.sampleChip}
              onPress={() => {
                setInputText(s.text);
                handleRunScan(s.text, s.type);
              }}
            >
              <Text style={styles.sampleChipText}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
    gap: 10,
  },
  header: {
    gap: 2,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
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
  inputArea: {
    backgroundColor: '#FAF8F4',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#221F1C',
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scanBtn: {
    backgroundColor: '#6B5FA8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  scanBtnDisabled: {
    backgroundColor: '#C4BFDC',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sampleSection: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0ECE4',
    paddingTop: 8,
  },
  sampleLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#8A8275',
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sampleChip: {
    backgroundColor: '#F5F2EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sampleChipText: {
    fontSize: 11,
    color: '#4A443B',
    fontWeight: '600',
  },
});
