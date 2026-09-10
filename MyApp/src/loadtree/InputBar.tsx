import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AudioModule, RecordingPresets, useAudioRecorder } from 'expo-audio';
import { Button, C, Icon, Notice, Sheet, SOFT_SHADOW, Txt } from './ui';

export interface Capture { title: string; note?: string }

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

// A file's own name is the only thing we read — nothing is uploaded or parsed.
const titleFromFile = (name: string) => name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Height of the on-screen keyboard, so the composer can sit above it. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, e => setInset(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return inset;
}

function AttachMenu({ onClose, onPick }: { onClose: () => void; onPick: (c: Capture) => void }) {
  const [error, setError] = useState('');

  const file = async () => {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: false }).catch(() => null);
    if (!picked || picked.canceled || !picked.assets?.length) return;
    const name = picked.assets[0].name;
    const title = titleFromFile(name);
    if (!title) { setError('That file has no readable name. Type the task instead.'); return; }
    onPick({ title, note: `From ${name}` });
  };

  const library = async () => {
    const granted = await ImagePicker.requestMediaLibraryPermissionsAsync().catch(() => null);
    if (!granted?.granted) { setError('Photo access was declined. You can still attach a file or type.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 }).catch(() => null);
    if (!picked || picked.canceled || !picked.assets?.length) return;
    onPick({ title: '', note: 'Photo attached' });
  };

  const camera = async () => {
    const granted = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (!granted?.granted) { setError('Camera access was declined. You can still attach a file or type.'); return; }
    const shot = await ImagePicker.launchCameraAsync({ quality: 0.7 }).catch(() => null);
    if (!shot || shot.canceled || !shot.assets?.length) return;
    onPick({ title: '', note: 'Photo attached' });
  };

  const rows = [
    { icon: 'doc', label: 'Upload a file', hint: 'Syllabus, brief or assignment sheet', run: file },
    { icon: 'image', label: 'Photo library', hint: 'A shot of a whiteboard or handout', run: library },
    { icon: 'camera', label: 'Take a photo', hint: 'Capture something right now', run: camera },
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close attachment menu" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(18,39,28,.4)', justifyContent: 'flex-end' }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: C.paper, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 26, gap: 4 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 8 }} />
          {rows.map(row => (
            <Pressable key={row.label} accessibilityRole="button" accessibilityLabel={row.label} onPress={row.run}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingHorizontal: 12, borderRadius: 18, backgroundColor: pressed ? C.sage : 'transparent' })}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.sage, alignItems: 'center', justifyContent: 'center' }}><Icon name={row.icon} size={21} /></View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontSize: 15.5, fontWeight: '700' }}>{row.label}</Txt>
                <Txt muted style={{ fontSize: 12.5 }}>{row.hint}</Txt>
              </View>
            </Pressable>
          ))}
          {error !== '' && <Notice tone="amber">{error}</Notice>}
          <Txt muted style={{ fontSize: 11.5, textAlign: 'center', paddingTop: 8 }}>We read the file name to start your roadmap. Nothing leaves this device.</Txt>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
    footer={<Button icon={error ? 'close' : 'stop'} onPress={finish}>{error ? 'Type the task instead' : 'Stop and use this'}</Button>}>
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

export function InputBar({ onCapture, onNotice, mode = 'full', hasHistory = false, onOpen }: {
  onCapture: (c: Capture) => void;
  onNotice: (message: string) => void;
  /** 'launcher' shows the box but hands taps to onOpen, so the real typing happens in the conversation. */
  mode?: 'full' | 'launcher';
  hasHistory?: boolean;
  onOpen?: () => void;
}) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(false);
  const [menu, setMenu] = useState(false);

  const send = () => {
    const title = text.trim();
    if (!title) { onNotice('Type what you need to do, then tap send.'); return; }
    setText('');
    Keyboard.dismiss();
    onCapture({ title });
  };

  const round = (label: string, icon: string, onPress: () => void, filled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: filled ? C.green : pressed ? C.sage : 'transparent', opacity: pressed && filled ? 0.8 : 1 })}>
      <Icon name={icon} size={filled ? 19 : 21} color={filled ? C.white : C.muted} />
    </Pressable>
  );

  return (
    <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 6, backgroundColor: C.paper }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, backgroundColor: C.white, borderRadius: 26, borderWidth: 1, borderColor: '#E3EDE7', paddingHorizontal: 5, paddingVertical: 5, ...SOFT_SHADOW }}>
        {round('Attach a file or photo', 'plus', () => { Keyboard.dismiss(); setMenu(true); })}
        {mode === 'launcher' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={hasHistory ? 'Open your conversation' : 'Plan something new'} onPress={onOpen}
            style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Txt muted style={{ fontSize: 15 }}>{hasHistory ? 'Continue planning…' : 'What needs doing?'}</Txt>
          </Pressable>
        ) : (
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={send}
            multiline
            blurOnSubmit
            returnKeyType="go"
            autoFocus
            accessibilityLabel="Describe a task or assignment"
            placeholder="What needs doing?"
            placeholderTextColor={C.muted}
            style={{ flex: 1, minWidth: 0, maxHeight: 110, fontSize: 15, lineHeight: 21, color: C.ink, paddingVertical: 11, paddingHorizontal: 4 }}
          />
        )}
        {round('Record a voice note', 'mic', () => { Keyboard.dismiss(); setVoice(true); })}
        {round(mode === 'launcher' ? 'Open your conversation' : 'Plan this task', 'send', mode === 'launcher' ? () => onOpen?.() : send, true)}
      </View>
      {mode === 'full' && <Txt muted style={{ fontSize: 12, textAlign: 'center' }}>We’ll break it into steps and fit it into your calendar.</Txt>}

      {menu && <AttachMenu onClose={() => setMenu(false)} onPick={c => { setMenu(false); onCapture(c); }} />}
      {voice && <VoiceSheet onClose={() => setVoice(false)} onDone={seconds => { setVoice(false); onCapture({ title: '', note: `Voice note · ${clock(seconds)}` }); }} />}
    </View>
  );
}
