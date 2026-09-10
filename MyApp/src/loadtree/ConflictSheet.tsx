import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { dateLabel, duration, time } from './model';
import { Conflict, conflictHeadline } from './conflict';
import { C, Icon, S, SOFT_SHADOW, Txt } from './ui';

/**
 * A short answer to a messy sentence. It sits over the calendar rather than
 * replacing it, so the week stays visible behind the decision.
 */
export function ConflictSheet({ conflict, onClose, onOptions, onAddAnyway }: {
  conflict: Conflict;
  onClose: () => void;
  onOptions: () => void;
  onAddAnyway: () => void;
}) {
  const { commitment, task, displacedMinutes, clashingCommitment } = conflict;
  const clean = !task && !clashingCommitment;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Dismiss" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(18,39,28,.28)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.paper, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, gap: 16, ...SOFT_SHADOW }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line }} />

          <Txt muted style={{ fontSize: 12, fontWeight: '700', letterSpacing: 0.4 }}>NEW COMMITMENT UNDERSTOOD</Txt>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="calendar" size={21} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.3 }}>{commitment.title}</Txt>
              <Txt muted style={{ fontSize: 13.5 }}>{dateLabel(commitment.date, true)} · {time(commitment.start)}–{time(commitment.end)}</Txt>
            </View>
          </View>

          <View style={{ padding: 14, borderRadius: 16, backgroundColor: clean ? C.tealBg : C.flagBg, gap: 4 }}>
            <Txt style={{ fontSize: 14, fontWeight: '700', color: clean ? C.teal : C.flag }}>
              {clean ? 'No conflict.' : clashingCommitment ? 'This time is already taken.' : 'This creates a scheduling conflict.'}
            </Txt>
            <Txt style={{ fontSize: 13.5, color: clean ? C.teal : '#8A6118' }}>{conflictHeadline(conflict)}</Txt>
            {displacedMinutes > 0 && <Txt style={{ fontSize: 12.5, color: '#8A6118' }}>{duration(displacedMinutes)} of scheduled work sits in this slot.</Txt>}
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.line, backgroundColor: C.white }}>
              <Txt style={{ fontWeight: '600' }}>Not now</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={clean ? onAddAnyway : onOptions} style={{ flex: 1.4, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: C.green }}>
              <Txt style={{ fontWeight: '700', color: C.white }}>{clean ? 'Add to calendar' : 'See options'}</Txt>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
