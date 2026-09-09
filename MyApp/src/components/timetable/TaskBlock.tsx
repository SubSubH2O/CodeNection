import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task, TaskCategory } from '../../types/task';

interface TaskBlockProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS: Record<TaskCategory, { bg: string; border: string; text: string }> = {
  coursework: { bg: '#F2EEF8', border: '#D3C6E8', text: '#573E7A' },
  work: { bg: '#EBF4F6', border: '#BBD8DE', text: '#2A5D6B' },
  errands: { bg: '#FBF5E8', border: '#E7D5AA', text: '#785A1D' },
  social: { bg: '#EEF2FB', border: '#C5D4F3', text: '#344C82' },
  personal: { bg: '#EDF6F1', border: '#C0DFCD', text: '#2C6442' },
  recovery: { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' },
};

export const TaskBlock: React.FC<TaskBlockProps> = ({ task, onToggleComplete, onDelete }) => {
  const scheme = CATEGORY_COLORS[task.category] || CATEGORY_COLORS.personal;

  return (
    <View
      style={[
        styles.block,
        { backgroundColor: scheme.bg, borderColor: scheme.border },
        task.completed && styles.blockCompleted,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.timeTag}>
          <Text style={[styles.timeText, { color: scheme.text }]}>
            {task.startTime || 'Flexible'} {task.endTime ? `- ${task.endTime}` : `(${task.durationMinutes}m)`}
          </Text>
        </View>
        {task.isBurnoutDebtLocked && (
          <View style={styles.lockedPill}>
            <Text style={styles.lockedPillText}>LOCKED RECOVERY</Text>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.title,
          { color: scheme.text },
          task.completed && styles.titleCompleted,
        ]}
      >
        {task.title}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.categoryBadge}>{task.category.toUpperCase()}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onToggleComplete(task.id)}
          >
            <Text style={styles.actionBtnText}>{task.completed ? 'Undo' : 'Done'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onDelete(task.id)}
          >
            <Text style={[styles.actionBtnText, styles.deleteText]}>Del</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    gap: 4,
    marginBottom: 8,
  },
  blockCompleted: {
    opacity: 0.55,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeTag: {},
  timeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  lockedPill: {
    backgroundColor: '#BE123C',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lockedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  categoryBadge: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#6B6459',
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38332C',
  },
  deleteText: {
    color: '#C44D56',
  },
});
