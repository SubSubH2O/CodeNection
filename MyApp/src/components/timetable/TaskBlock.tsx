import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Task, TaskCategory } from '../../types/task';
import { BotanicalTokens } from '../../theme/tokens';

interface TaskBlockProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onPress?: (task: Task) => void;
}

const CATEGORY_META: Record<
  TaskCategory,
  { emoji: string; bg: string; border: string; text: string; label: string }
> = {
  coursework: {
    emoji: '🧠',
    bg: '#ffdad3',
    border: '#ff9881',
    text: '#974634',
    label: 'Mental',
  },
  work: {
    emoji: '💼',
    bg: '#e7e2d9',
    border: '#bec9c1',
    text: '#1d1b16',
    label: 'Work',
  },
  errands: {
    emoji: '🧺',
    bg: '#ffddb2',
    border: '#ffb94c',
    text: '#774f00',
    label: 'Errand',
  },
  social: {
    emoji: '💬',
    bg: '#d0ffe3',
    border: '#88d6af',
    text: '#096444',
    label: 'Social',
  },
  personal: {
    emoji: '🍃',
    bg: '#f3ede4',
    border: '#ebdccb',
    text: '#43362a',
    label: 'Rest',
  },
  recovery: {
    emoji: '🌿',
    bg: '#ffdad6',
    border: '#ba1a1a',
    text: '#93000a',
    label: 'Recovery Buffer',
  },
};

export const TaskBlock: React.FC<TaskBlockProps> = ({
  task,
  onToggleComplete,
  onDelete,
  onPress,
}) => {
  const meta = CATEGORY_META[task.category] || CATEGORY_META.personal;

  return (
    <View style={styles.rowWrapper}>
      {/* Time Label */}
      <View style={styles.timeCol}>
        <Text style={styles.timeText}>{task.startTime || 'Flex'}</Text>
      </View>

      {/* Task Card Container */}
      <TouchableOpacity
        style={[
          styles.taskCard,
          { backgroundColor: meta.bg, borderColor: meta.border },
          task.completed && styles.cardCompleted,
        ]}
        activeOpacity={0.85}
        onPress={() => onPress?.(task)}
      >
        <View style={styles.contentLeft}>
          <Text style={styles.categoryEmoji}>{meta.emoji}</Text>
          <View style={styles.titleCol}>
            <Text
              style={[
                styles.titleText,
                { color: meta.text },
                task.completed && styles.titleCompleted,
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>
            {task.isBurnoutDebtLocked ? (
              <Text style={styles.lockedText}>LOCKED RECOVERY · REST PRESERVED</Text>
            ) : (
              <Text style={styles.subMeta}>
                {meta.label} · {task.difficulty}/5 Strain
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightActions}>
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{task.durationMinutes}m</Text>
          </View>

          <TouchableOpacity
            style={styles.doneToggle}
            onPress={(e) => {
              e.stopPropagation();
              onToggleComplete(task.id);
            }}
          >
            <Text style={styles.doneToggleText}>{task.completed ? '↩' : '✓'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
          >
            <Text style={styles.deleteBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  rowWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timeCol: {
    width: 44,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.primary,
  },
  taskCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BotanicalTokens.radii.lg,
    borderWidth: 1,
    ...BotanicalTokens.shadows.soft,
  },
  cardCompleted: {
    opacity: 0.5,
  },
  contentLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryEmoji: {
    fontSize: 16,
  },
  titleCol: {
    flex: 1,
    gap: 1,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  lockedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#93000a',
  },
  subMeta: {
    fontSize: 10,
    fontWeight: '500',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 6,
  },
  durationBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: BotanicalTokens.radii.full,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  doneToggle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneToggleText: {
    fontSize: 11,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  deleteBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: BotanicalTokens.colors.error,
  },
});
