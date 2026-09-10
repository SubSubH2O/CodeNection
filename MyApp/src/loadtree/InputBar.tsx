import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { Button, C, Icon, Notice, Sheet, SOFT_SHADOW, Txt } from './ui';

export interface Capture { title: string; note?: string }

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// A document's own name is the only thing we read — nothing is uploaded or parsed.
function titleFromFile(name: string) {
  return name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function VoiceSheet({ onClose, onDone }: { onClose: () => void; onDone: (seconds: number) => void }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');
  const [live, setLive] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const granted = await AudioModule.requestRecordingPermissionsAsync().catch(() => null);
      if (!active) return;
      if (!granted?.granted) { setError('Microphone access was declined. You can still type the task.'); return; }
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        started.current = true;
        setLive(true);
      } catch {
        setError('Recording is not available on this device. You can still type the task.');
      }
    })();
    return () => { active = false; if (started.current) { try { recorder.stop(); } catch {} } };
  }, []);

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [live]);

  const finish = async () => {
    if (started.current) { try { await recorder.stop(); } catch {} started.current = false; }
    onDone(elapsed);
  };

  return <Sheet title="Voice note" subtitle={error ? 'Nothing was recorded' : 'Recording on this device'} onClose={onClose}
    footer={<Button icon={error ? 'plus' : 'stop'} onPress={finish}>{error ? 'Type the task instead' : 'Stop and use this'}</Button>}>
    {error ? <Notice tone="amber">{error}</Notice> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 64 }}>
        {Array.from({ length: 26 }, (_, i) => {
          const h = 10 + Math.abs(Math.sin((i + elapsed) * 0.9)) * 38;
          return <View key={i} style={{ width: 4, height: live ? h : 10, borderRadius: 2, backgroundColor: live ? C.moss : C.line }} />;
        })}
      </View>
      <Txt style={{ textAlign: 'center', fontSize: 30, fontWeight: '800', color: C.ink }}>{clock(elapsed)}</Txt>
    </>}
    <Txt muted style={{ fontSize: 12.5, textAlign: 'center' }}>The audio stays on this device. Add a title next — automatic transcription arrives in the build phase.</Txt>
  </Sheet>;
}

export function InputBar({ onCapture, onManual, onNotice }: { onCapture: (c: Capture) => void; onManual: () => void; onNotice: (message: string) => void }) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);

  const send = () => {
    const title = text.trim();
    if (!title) { onNotice('Type what you need to do, then tap Plan.'); return; }
    setText('');
    onCapture({ title });
  };

  const attach = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], copyToCacheDirectory: false });
      if (picked.canceled || !picked.assets?.length) return;
      const title = titleFromFile(picked.assets[0].name);
      if (!title) { onNotice('That file has no readable name. Type the task instead.'); return; }
      onCapture({ title, note: `From ${picked.assets[0].name}` });
    } catch {
      onNotice('Could not open the file picker on this device.');
    }
  };

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 7, backgroundColor: C.paper }}>
      <View style={{ backgroundColor: C.white, borderRadius: 26, borderWidth: 1, borderColor: '#E3EDE7', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, gap: 4, ...SOFT_SHADOW }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            returnKeyType="go"
            accessibilityLabel="Describe a task or assignment"
            placeholder="What needs doing?"
            placeholderTextColor={C.muted}
            style={{ flex: 1, minWidth: 0, fontSize: 15, color: C.ink, paddingVertical: 10, paddingHorizontal: 8 }}
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Plan this task" onPress={send} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="send" size={19} color={C.white} />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 2 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Attach a syllabus or brief" onPress={attach} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.sage : 'transparent' })}>
            <Icon name="clip" size={19} color={C.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Record a voice note" onPress={() => setVoice(true)} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.sage : 'transparent' })}>
            <Icon name="mic" size={19} color={C.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Build a roadmap by hand" onPress={onManual} style={({ pressed }) => ({ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.sage : 'transparent' })}>
            <Icon name="plus" size={19} color={C.muted} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Txt muted style={{ fontSize: 11.5, paddingRight: 6 }}>Attach · speak · or type</Txt>
        </View>
      </View>
      <Txt muted style={{ fontSize: 12, textAlign: 'center' }}>We’ll break it into steps and fit it into your calendar.</Txt>
      {voice && <VoiceSheet onClose={() => setVoice(false)} onDone={seconds => { setVoice(false); onCapture({ title: '', note: `Voice note · ${clock(seconds)}` }); }} />}
    </View>
  );
}
