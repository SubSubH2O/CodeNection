import React from 'react';
import { Pressable, View } from 'react-native';
import { Block, Task, dateLabel, duration, stamp, time } from './model';
import { C, Chip, Icon, S, Txt } from './ui';

export function TaskSpine({ task, blocks, now, onJump, onProgress }: { task: Task; blocks: Block[]; now: string; onJump: (block: Block) => void; onProgress: (stepId: string) => void }) {
  return <View>{task.steps.map((step, i) => {
    const scheduled = blocks.filter(b => b.taskId === task.id && b.stepId === step.id && stamp(b, true) > now).sort((a, b) => stamp(a).localeCompare(stamp(b)));
    const first = scheduled[0];
    const done = step.remaining === 0;
    return <View key={step.id} style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{ width: 28, alignItems: 'center' }}><View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: done ? C.green : C.sage, alignItems: 'center', justifyContent: 'center' }}>{done ? <Icon name="check" color={C.white} size={17} /> : <Txt style={{ fontWeight: '700', fontSize: 12 }}>{i + 1}</Txt>}</View>{i < task.steps.length - 1 && <View style={{ flex: 1, width: 2, backgroundColor: C.line }} />}</View>
      <View style={{ flex: 1, paddingBottom: 20, gap: 8 }}>
        <Pressable accessibilityRole={first && !done ? 'button' : undefined} accessibilityLabel={`${step.title}${first && !done ? `, show ${dateLabel(first.date)} ${time(first.start)}` : ''}`} disabled={!first || done} onPress={() => first && onJump(first)} style={{ gap: 5 }}>
          <Txt style={{ fontWeight: '700', textDecorationLine: done ? 'line-through' : 'none' }}>{step.title}</Txt>
          <Txt muted style={{ fontSize: 12 }}>{duration(done ? step.estimate : step.remaining)}{done ? ' · complete' : ' left'}</Txt>
        </Pressable>
        {!done && <View style={{ gap: 6 }}>{scheduled.length ? scheduled.map(block => <Chip key={block.id} icon="calendar" onPress={() => onJump(block)}>{`${dateLabel(block.date)} ${time(block.start)} · ${duration(block.end - block.start)}`}</Chip>) : <Chip tone="amber">Not scheduled</Chip>}</View>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Update ${step.title}`} onPress={() => onProgress(step.id)} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Txt style={{ fontSize: 12, color: C.green, fontWeight: '600' }}>{done ? 'Correct progress' : 'Update progress'}</Txt></Pressable>
      </View>
    </View>;
  })}</View>;
}
