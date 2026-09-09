import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTasks, useSelectedDate, taskActions } from '../store/useTaskStore';
import { useLoadMetrics, loadStore } from '../store/useLoadStore';
import { TimetableGrid } from '../components/timetable/TimetableGrid';
import { CapacitySidebar } from '../components/timetable/CapacitySidebar';
import { CircuitBreakerModal } from '../components/circuitBreaker/CircuitBreakerModal';
import { evaluateCircuitBreaker } from '../core/circuitBreaker/circuitBreakerEngine';
import { Task, TaskCategory } from '../types/task';
import {
  CircuitBreakerPayload,
  CircuitBreakerOption,
  SwapOption,
  ScopeDownOption,
  RescheduleOption,
  BurnoutDebtOption,
} from '../types/circuitBreaker';
import { BotanicalTokens } from '../theme/tokens';

const WEEK_DAYS = [
  { day: 'MON', dateNum: '24', date: '2026-09-08' },
  { day: 'TUE', dateNum: '25', date: '2026-09-09' },
  { day: 'WED', dateNum: '26', date: '2026-09-10' },
  { day: 'THU', dateNum: '27', date: '2026-09-11' },
  { day: 'FRI', dateNum: '28', date: '2026-09-12' },
];

const FILTER_CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'all', label: 'All', emoji: '✨' },
  { id: 'coursework', label: 'Mental', emoji: '🧠' },
  { id: 'personal', label: 'Rest', emoji: '🍃' },
  { id: 'social', label: 'Social', emoji: '💬' },
  { id: 'errands', label: 'Errand', emoji: '🧺' },
];

export const TimetableScreen: React.FC = () => {
  const tasks = useTasks();
  const selectedDate = useSelectedDate();
  const metrics = useLoadMetrics();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  // Add Task Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [category, setCategory] = useState<TaskCategory>('coursework');
  const [isFlexible, setIsFlexible] = useState(true);
  const [difficulty, setDifficulty] = useState(3);

  // Circuit Breaker Interception State
  const [circuitBreakerPayload, setCircuitBreakerPayload] = useState<CircuitBreakerPayload | null>(null);

  const dayTasks = tasks.filter((t) => {
    const isDateMatch = t.scheduledDate === selectedDate;
    if (!isDateMatch) return false;
    if (activeCategoryFilter === 'all') return true;
    return t.category === activeCategoryFilter;
  });

  const handleCreateTask = () => {
    if (!title.trim()) return;

    const parsedDuration = parseInt(durationMinutes, 10) || 60;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      category,
      priority: 'high',
      isFlexible,
      durationMinutes: parsedDuration,
      dueDate: selectedDate,
      scheduledDate: selectedDate,
      startTime: '10:00',
      difficulty,
      milestones: [],
      completed: false,
      primaryDimension:
        category === 'coursework' || category === 'work'
          ? 'mental'
          : category === 'errands'
          ? 'errands'
          : 'social',
    };

    // Evaluate Circuit Breaker
    const evaluation = evaluateCircuitBreaker(
      tasks,
      newTask,
      loadStore.getState().dailyCapacityMinutes
    );

    if (evaluation.triggered) {
      setAddModalVisible(false);
      setCircuitBreakerPayload(evaluation);
    } else {
      taskActions.addTask(newTask);
      setAddModalVisible(false);
      resetForm();
    }
  };

  const handleApplyResolution = (option: CircuitBreakerOption) => {
    if (!circuitBreakerPayload) return;
    const offending = circuitBreakerPayload.offendingTask;

    switch (option.type) {
      case 'swap': {
        const swapOpt = option as SwapOption;
        taskActions.postponeTask(swapOpt.swappedTask.id, swapOpt.targetNewDate);
        taskActions.addTask(offending);
        break;
      }
      case 'scope_down': {
        const scopeOpt = option as ScopeDownOption;
        const immediateTask: Task = {
          ...offending,
          durationMinutes: scopeOpt.immediateMinutes,
          title: `${offending.title} [45m Sprint Outline]`,
        };
        taskActions.addTask(immediateTask);

        if (scopeOpt.deferredMinutes > 0) {
          const deferredTask: Task = {
            ...offending,
            id: `deferred-${Date.now()}`,
            durationMinutes: scopeOpt.deferredMinutes,
            title: `${offending.title} [Completion Sprint]`,
            scheduledDate: scopeOpt.deferredDate,
          };
          taskActions.addTask(deferredTask);
        }
        break;
      }
      case 'reschedule': {
        const reschedOpt = option as RescheduleOption;
        const movedTask: Task = {
          ...offending,
          scheduledDate: reschedOpt.recommendedDate,
          startTime: reschedOpt.recommendedStartTime,
          endTime: reschedOpt.recommendedEndTime,
        };
        taskActions.addTask(movedTask);
        break;
      }
      case 'burnout_debt': {
        const debtOpt = option as BurnoutDebtOption;
        taskActions.addTask(offending);
        taskActions.addBurnoutDebtLock(
          debtOpt.recoveryDate,
          '11:00',
          '11:30',
          debtOpt.recoveryDurationMinutes
        );
        break;
      }
    }

    setCircuitBreakerPayload(null);
    resetForm();
  };

  const resetForm = () => {
    setTitle('');
    setDurationMinutes('90');
    setCategory('coursework');
    setIsFlexible(true);
    setDifficulty(3);
  };

  return (
    <View style={styles.container}>
      {/* Stitch Week Header & Quick Switcher */}
      <View style={styles.weekHeaderCard}>
        <View style={styles.weekLeft}>
          <View style={styles.calendarIconBox}>
            <Text style={styles.calendarEmoji}>📅</Text>
          </View>
          <View>
            <Text style={styles.weekRangeTitle}>Oct 24 – 28</Text>
            <Text style={styles.weekPhaseSubtitle}>Sprout Phase · Waning Harvest</Text>
          </View>
        </View>

        <View style={styles.weekSwitcherPill}>
          <Text style={styles.switchArrow}>‹</Text>
          <Text style={styles.switchActiveText}>This Week</Text>
          <Text style={styles.switchArrow}>›</Text>
        </View>
      </View>

      {/* Stitch Category Filter Chips */}
      <View style={styles.filtersRow}>
        {FILTER_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.filterChip,
              activeCategoryFilter === cat.id && styles.filterChipActive,
            ]}
            onPress={() => setActiveCategoryFilter(cat.id)}
          >
            <Text style={styles.filterChipEmoji}>{cat.emoji}</Text>
            <Text
              style={[
                styles.filterChipText,
                activeCategoryFilter === cat.id && styles.filterChipTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mini Calendar Weekstrip */}
      <View style={styles.weekstrip}>
        {WEEK_DAYS.map((w) => {
          const isSelected = selectedDate === w.date;
          return (
            <TouchableOpacity
              key={w.date}
              style={[styles.stripDay, isSelected && styles.stripDayActive]}
              onPress={() => taskActions.setSelectedDate(w.date)}
            >
              <Text style={[styles.stripDayName, isSelected && styles.stripDayNameActive]}>
                {w.day}
              </Text>
              <Text style={[styles.stripDateNum, isSelected && styles.stripDateNumActive]}>
                {w.dateNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Main Timetable Content */}
      <View style={styles.timetableRow}>
        <CapacitySidebar
          overall={metrics.overall}
          status={metrics.status}
          dimensions={metrics.dimensions}
        />

        <View style={styles.gridCol}>
          <View style={styles.gridHeaderRow}>
            <Text style={styles.gridHeadingText}>
              {dayTasks.length} Commitments Scheduled
            </Text>
            <TouchableOpacity style={styles.addCommitmentBtn} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addBtnText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>

          <TimetableGrid
            tasks={dayTasks}
            onToggleComplete={taskActions.toggleComplete}
            onDelete={taskActions.removeTask}
          />
        </View>
      </View>

      {/* Add Task Modal */}
      <Modal visible={addModalVisible} transparent animationType="fade" onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Plant New Commitment 🌱</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Quarterly OKR Review"
                placeholderTextColor={BotanicalTokens.colors.outline}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Duration (Minutes)</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={durationMinutes}
                onChangeText={setDurationMinutes}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Branch Category</Text>
              <View style={styles.chipsRow}>
                {(['coursework', 'work', 'errands', 'social', 'personal'] as TaskCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Can this move if heavy? (Flexibility)</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.flexBtn, isFlexible && styles.flexBtnActive]}
                  onPress={() => setIsFlexible(true)}
                >
                  <Text style={[styles.flexBtnText, isFlexible && styles.flexBtnTextActive]}>Flexible</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.flexBtn, !isFlexible && styles.flexBtnActive]}
                  onPress={() => setIsFlexible(false)}
                >
                  <Text style={[styles.flexBtnText, !isFlexible && styles.flexBtnTextActive]}>Fixed</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleCreateTask}>
                <Text style={styles.modalSubmitText}>Commit to Garden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Circuit Breaker Modal */}
      <CircuitBreakerModal
        payload={circuitBreakerPayload}
        onSelectOption={handleApplyResolution}
        onDismiss={() => setCircuitBreakerPayload(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BotanicalTokens.colors.backgroundCanvas,
    padding: 14,
    gap: 10,
  },
  weekHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surface,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.lg,
    padding: 12,
    ...BotanicalTokens.shadows.soft,
  },
  weekLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(9, 100, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarEmoji: {
    fontSize: 16,
  },
  weekRangeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  weekPhaseSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  weekSwitcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BotanicalTokens.radii.full,
    gap: 6,
  },
  switchArrow: {
    fontSize: 13,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  switchActiveText: {
    fontSize: 11,
    fontWeight: '800',
    color: BotanicalTokens.colors.primary,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BotanicalTokens.colors.surface,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BotanicalTokens.radii.full,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#ffdad3',
    borderColor: '#ff9881',
  },
  filterChipEmoji: {
    fontSize: 12,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  filterChipTextActive: {
    color: '#974634',
    fontWeight: '800',
  },
  weekstrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: BotanicalTokens.colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.md,
    padding: 4,
  },
  stripDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: BotanicalTokens.radii.sm,
  },
  stripDayActive: {
    backgroundColor: BotanicalTokens.colors.primary,
    ...BotanicalTokens.shadows.soft,
  },
  stripDayName: {
    fontSize: 9,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  stripDayNameActive: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  stripDateNum: {
    fontSize: 14,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  stripDateNumActive: {
    color: '#ffffff',
  },
  timetableRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  gridCol: {
    flex: 1,
    gap: 6,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  gridHeadingText: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.textMuted,
  },
  addCommitmentBtn: {
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: BotanicalTokens.radii.full,
    ...BotanicalTokens.shadows.soft,
  },
  addBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(60, 40, 20, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fffdf9',
    borderRadius: BotanicalTokens.radii.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    gap: 12,
    ...BotanicalTokens.shadows.modal,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    borderRadius: BotanicalTokens.radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: BotanicalTokens.colors.onSurfaceDark,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BotanicalTokens.radii.full,
    borderWidth: 1,
    borderColor: BotanicalTokens.colors.borderSandstone,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: BotanicalTokens.colors.primary,
    borderColor: BotanicalTokens.colors.primary,
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: BotanicalTokens.colors.surfaceContainer,
    borderRadius: BotanicalTokens.radii.full,
    padding: 2,
  },
  flexBtn: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: BotanicalTokens.radii.full,
  },
  flexBtnActive: {
    backgroundColor: '#ffffff',
    ...BotanicalTokens.shadows.soft,
  },
  flexBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: BotanicalTokens.colors.onSurfaceVariant,
  },
  flexBtnTextActive: {
    color: BotanicalTokens.colors.onSurfaceDark,
    fontWeight: '800',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  modalCancel: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: BotanicalTokens.colors.textMuted,
  },
  modalSubmit: {
    backgroundColor: BotanicalTokens.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: BotanicalTokens.radii.full,
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
