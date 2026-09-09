import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Task } from '../../types/task';
import { TaskBlock } from './TaskBlock';

interface TimetableGridProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TimetableGrid: React.FC<TimetableGridProps> = ({
  tasks,
  onToggleComplete,
  onDelete,
}) => {
  // Sort timed tasks first by startTime, then untimed
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
    if (a.startTime) return -1;
    if (b.startTime) return 1;
    return 0;
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {sortedTasks.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Zero Commitments Scheduled</Text>
          <Text style={styles.emptySub}>Add a task or scan an assignment to populate your day.</Text>
        </View>
      ) : (
        sortedTasks.map((t) => (
          <TaskBlock
            key={t.id}
            task={t}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
          />
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#DCD6CB',
    padding: 24,
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#38332C',
  },
  emptySub: {
    fontSize: 12,
    color: '#8A8275',
    textAlign: 'center',
  },
});
