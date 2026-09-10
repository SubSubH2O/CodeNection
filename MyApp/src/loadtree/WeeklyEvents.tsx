import React from 'react';
import { Pressable, View } from 'react-native';
import { Commitment, Dimension, WEEK, dateLabel, time } from './model';
import { Button, C, DIM_TONE, Group, Icon, Sheet, Txt } from './ui';

const KIND_LABEL: Record<Commitment['kind'], string> = {
  fixed: 'Fixed',
  flexible: 'Flexible',
  recovery: 'Rest',
};

const DIM_LABEL: Record<Dimension, string> = {
  mental: 'Mental',
  time: 'Time',
  physical: 'Physical',
  social: 'Social',
  errands: 'Errands',
};

export function WeeklyEventsSheet({
  commitments,
  onClose,
  onNewEvent,
  onEditEvent,
}: {
  commitments: Commitment[];
  onClose: () => void;
  onNewEvent: (date?: string) => void;
  onEditEvent: (id: string) => void;
}) {
  // Exclude background sleep/recovery routines from the active events list
  const activeEvents = commitments.filter(c => c.kind !== 'recovery');

  const eventsByDay = WEEK.map(date => ({
    date,
    events: activeEvents.filter(c => c.date === date).sort((a, b) => a.start - b.start),
  }));

  const totalEvents = activeEvents.length;

  return (
    <Sheet
      title="Events this week"
      subtitle={`${totalEvents} ${totalEvents === 1 ? 'event' : 'events'} across the week`}
      onClose={onClose}
    >
      <View style={{ gap: 14 }}>
        <Button
          icon="plus"
          onPress={() => onNewEvent(WEEK[0])}
        >
          Add new event
        </Button>

        {eventsByDay.map(({ date, events }) => {
          const isToday = new Date().toISOString().slice(0, 10) === date;
          return (
            <Group
              key={date}
              title={`${dateLabel(date, true)}${isToday ? ' · Today' : ''}`}
            >
              {events.length === 0 ? (
                <View style={{ paddingVertical: 12, paddingHorizontal: 4 }}>
                  <Txt muted style={{ fontSize: 13 }}>No events scheduled.</Txt>
                </View>
              ) : (
                events.map((event, idx) => {
                  const tone = DIM_TONE[event.dimension] ?? DIM_TONE.mental;
                  return (
                    <Pressable
                      key={event.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${event.title}, ${time(event.start)} to ${time(event.end)}`}
                      onPress={() => onEditEvent(event.id)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.6 : 1,
                        paddingVertical: 10,
                        borderTopWidth: idx > 0 ? 1 : 0,
                        borderColor: C.line,
                      })}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: tone.fg,
                          }}
                        />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Txt style={{ fontSize: 16, fontWeight: '600' }}>
                            {event.title}
                          </Txt>
                          <Txt muted style={{ fontSize: 13 }}>
                            {time(event.start)} – {time(event.end)} · {DIM_LABEL[event.dimension] || 'Mental'}
                          </Txt>
                        </View>
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 8,
                            backgroundColor: event.kind === 'fixed' ? C.sage : C.flagBg,
                          }}
                        >
                          <Txt
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: event.kind === 'fixed' ? C.green : C.flag,
                            }}
                          >
                            {KIND_LABEL[event.kind]}
                          </Txt>
                        </View>
                        <Icon name="forward" size={16} color={C.muted} />
                      </View>
                    </Pressable>
                  );
                })
              )}
            </Group>
          );
        })}
      </View>
    </Sheet>
  );
}
