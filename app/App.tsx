import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  clearCall,
  clearNotification,
  sendCall,
  sendDate,
  sendNotification,
  sendTime,
  sendWeather,
} from './src/ble';
import { useWatch } from './src/useWatch';

function Button({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [s.btn, danger && s.btnDanger, disabled && s.btnDisabled, pressed && { opacity: 0.7 }]}
    >
      <Text style={s.btnText}>{label}</Text>
    </Pressable>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function App() {
  const { status, error, battery, voltage, connect, disconnect, run } = useWatch();
  const [weather, setWeather] = useState('24C');
  const [message, setMessage] = useState('');
  const [caller, setCaller] = useState('Mom');
  const connected = status === 'connected';
  const busy = status === 'scanning' || status === 'connecting';

  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>Smart Table Assistant</Text>

        <Card title="Connection">
          <View style={s.row}>
            <View style={[s.dot, { backgroundColor: connected ? '#3ddc84' : busy ? '#f5b942' : '#6b7280' }]} />
            <Text style={s.text}>
              {status === 'idle' ? 'Disconnected' : status === 'scanning' ? 'Scanning for XIAO-Watch…' : status === 'connecting' ? 'Connecting…' : 'Connected to XIAO-Watch'}
            </Text>
            {busy && <ActivityIndicator style={{ marginLeft: 8 }} />}
          </View>
          {connected ? (
            <Button label="Disconnect" onPress={disconnect} danger />
          ) : (
            <Button label="Scan & Connect" onPress={connect} disabled={busy} />
          )}
          {error && <Text style={s.error}>{error}</Text>}
        </Card>

        <Card title="Battery">
          <Text style={s.big}>{battery !== null ? `${battery}%` : '—'}</Text>
          <Text style={s.muted}>{voltage !== null ? `${voltage.toFixed(2)} V` : 'No data yet'}</Text>
        </Card>

        <Card title="Time, date & weather">
          <Button label="Sync time & date from phone" disabled={!connected} onPress={() => run(async (d) => { await sendTime(d); await sendDate(d); })} />
          <TextInput style={s.input} value={weather} onChangeText={setWeather} placeholder='e.g. 24C or "24, Clear"' placeholderTextColor="#6b7280" maxLength={40} />
          <Button label="Send weather" disabled={!connected || !weather.trim()} onPress={() => run((d) => sendWeather(d, weather.trim()))} />
        </Card>

        <Card title="Notification">
          <TextInput style={s.input} value={message} onChangeText={setMessage} placeholder="Message (max 40 chars)" placeholderTextColor="#6b7280" maxLength={40} />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button label="Send" disabled={!connected || !message.trim()} onPress={() => run((d) => sendNotification(d, message.trim()))} />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <Button label="Dismiss" disabled={!connected} onPress={() => run(clearNotification)} danger />
            </View>
          </View>
        </Card>

        <Card title="Incoming call alert">
          <TextInput style={s.input} value={caller} onChangeText={setCaller} placeholder="Caller (max 20 chars)" placeholderTextColor="#6b7280" maxLength={20} />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Button label="Ring" disabled={!connected || !caller.trim()} onPress={() => run((d) => sendCall(d, caller.trim()))} />
            </View>
            <View style={{ width: 8 }} />
            <View style={{ flex: 1 }}>
              <Button label="Hang up" disabled={!connected} onPress={() => run(clearCall)} danger />
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0f14' },
  scroll: { padding: 16, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginVertical: 8 },
  card: { backgroundColor: '#151b23', borderRadius: 14, padding: 14, gap: 10 },
  cardTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  text: { color: '#e5e7eb', fontSize: 15 },
  big: { color: '#fff', fontSize: 40, fontWeight: '700' },
  muted: { color: '#9ca3af' },
  error: { color: '#f87171' },
  input: { backgroundColor: '#0b0f14', color: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#262e38' },
  btn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnDanger: { backgroundColor: '#7f1d1d' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontWeight: '600' },
});
