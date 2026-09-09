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
import { Task, TaskCategory, TaskPriority } from '../types/task';
import {
  CircuitBreakerPayload,
  CircuitBreakerOption,
  SwapOption,
  ScopeDownOption,
  RescheduleOption,
  BurnoutDebtOption,
} from '../types/circuitBreaker';

const DATES = [
  { label: 'Wed', date: '2026-09-09' },
  { label: 'Thu (Today)', date: '2026-09-10' },
  { label: 'Fri', date: '2026-09-11' },
];

export const TimetableScreen: React.FC = () => {
  const tasks = useTasks();
  const selectedDate = useSelectedDate();
  const metrics = useLoadMetrics();

  // Add Task Modal State
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [category, setCategory] = useState<TaskCategory>('coursework');
  const [isFlexible, setIsFlexible] = useState(true);
  const [difficulty, setDifficulty] = useState(3);

  // Circuit Breaker Interception State
  const [circuitBreakerPayload, setCircuitBreakerPayload] = useState<CircuitBreakerPayload | null>(null);

  const dayTasks = tasks.filter((t) => t.scheduledDate === selectedDate);

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
      difficulty,
      milestones: [],
      completed: false,
      primaryDimension: category === 'coursework' || category === 'work' ? 'mental' : category === 'errands' ? 'errands' : 'social',
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
        // Postpone swapped task to next date
        taskActions.postponeTask(swapOpt.swappedTask.id, swapOpt.targetNewDate);
        // Add the offending task
        taskActions.addTask(offending);
        break;
      }
      case 'scope_down': {
        const scopeOpt = option as ScopeDownOption;
        // Add 45-minute sprint tonight
        const immediateTask: Task = {
          ...offending,
          durationMinutes: scopeOpt.immediateMinutes,
          title: `${offending.title} [45m Sprint Outline]`,
        };
        taskActions.addTask(immediateTask);

        // Defer remainder to next date
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
        // Add offending task tonight
        taskActions.addTask(offending);
        // Inject locked recovery block tomorrow
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
      {/* Date Switcher */}
      <View style={styles.dateRow}>
        {DATES.map((d) => (
          <TouchableOpacity
            key={d.date}
            style={[styles.dateTab, selectedDate === d.date && styles.dateTabActive]}
            onPress={() => taskActions.setSelectedDate(d.date)}
          >
            <Text style={[styles.dateTabText, selectedDate === d.date && styles.dateTabTextActive]}>
              {d.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main Grid + Sidebar Layout */}
      <View style={styles.scheduleRow}>
        <CapacitySidebar
          overall={metrics.overall}
          status={metrics.status}
          dimensions={metrics.dimensions}
        />

        <View style={styles.gridCol}>
          <View style={styles.gridHeader}>
            <Text style={styles.gridCountText}>{dayTasks.length} Commitments</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
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
            <Text style={styles.modalTitle}>New Commitment</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Operating Systems Lab"
                placeholderTextColor="#A8A297"
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
              <Text style={styles.inputLabel}>Category</Text>
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
              <Text style={styles.inputLabel}>Can this move if busy? (Flexibility)</Text>
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
                <Text style={styles.modalSubmitText}>Commit to Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Circuit Breaker Interception Modal */}
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
    backgroundColor: '#FAF8F4',
    padding: 16,
    gap: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6E1D8',
    alignItems: 'center',
  },
  dateTabActive: {
    backgroundColor: '#221F1C',
    borderColor: '#221F1C',
  },
  dateTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6459',
  },
  dateTabTextActive: {
    color: '#FFFFFF',
  },
  scheduleRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  gridCol: {
    flex: 1,
    gap: 8,
  },
  gridHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B6459',
  },
  addBtn: {
    backgroundColor: '#4C7A67',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 27, 25, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FAF8F4',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6E1D8',
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#221F1C',
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B6459',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCD6CB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#221F1C',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCD6CB',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#221F1C',
    borderColor: '#221F1C',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4A443B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#EBE7DE',
    borderRadius: 8,
    padding: 2,
  },
  flexBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  flexBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  flexBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B6459',
  },
  flexBtnTextActive: {
    color: '#221F1C',
    fontWeight: '700',
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
    color: '#6B6459',
  },
  modalSubmit: {
    backgroundColor: '#4C7A67',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
