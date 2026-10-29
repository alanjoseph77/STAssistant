import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GlossButton, ListCard, ListRow, SectionLabel, WatchCard } from './src/components';
import { clearNotification, formatDate, sendDate, sendNotification, sendTime, sendWeather } from './src/ble';
import { colors } from './src/theme';
import { useForwarding } from './src/useForwarding';
import { useWatch } from './src/useWatch';

const QUICK_MESSAGES = ['Drink water', 'Break time', 'Call me'];

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function App() {
  const { status, error, battery, voltage, connect, disconnect, run } = useWatch();
  const connected = status === 'connected';
  const busy = status === 'scanning' || status === 'connecting';
  const fwd = useForwarding(connected, run);
  const now = useClock();
  const [temp, setTemp] = useState('24');
  const [message, setMessage] = useState('');

  const h = now.getHours() % 12 || 12;
  const time = `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.title}>DeskMate</Text>
        <View style={s.sub}>
          <View style={[s.dot, !connected && s.dotOff]} />
          <Text style={s.subText}>
            {connected ? 'Connected to XIAO-Watch' : status === 'scanning' ? 'Searching for your watch…' : status === 'connecting' ? 'Connecting…' : 'Not connected'}
          </Text>
        </View>

        {!connected ? (
          <View style={s.empty}>
            <View style={s.emptyCircle}>
              {busy ? <ActivityIndicator color={colors.green} size="large" /> : <Ionicons name="watch-outline" size={40} color={colors.greenDark} />}
            </View>
            <Text style={s.emptyTitle}>{busy ? 'Looking for your watch' : 'Watch not connected'}</Text>
            <Text style={s.emptyText}>Turn on the device and keep it{'\n'}near your phone.</Text>
            {error && <Text style={s.error}>{error}</Text>}
          </View>
        ) : (
          <>
            <WatchCard>
              <View>
                <Text style={s.clock}>
                  {time}
                  <Text style={s.ampm}> {ampm}</Text>
                </Text>
                <Text style={s.cardSub}>
                  {formatDate(now)} · {temp}°C
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.battery}>{battery !== null ? `${battery}%` : '--'}</Text>
                <Text style={s.cardSub}>{voltage !== null ? `${voltage.toFixed(2)} V` : '— V'}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${battery ?? 0}%` }]} />
                </View>
              </View>
            </WatchCard>

            <GlossButton
              label="Sync time & date"
              style={{ marginTop: 12 }}
              onPress={() =>
                run(async (d) => {
                  await sendTime(d);
                  await sendDate(d);
                })
              }
            />

            <SectionLabel>Temperature</SectionLabel>
            <View style={s.inline}>
              <View style={[s.input, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                <TextInput
                  style={s.inputText}
                  value={temp}
                  onChangeText={setTemp}
                  keyboardType="numeric"
                  maxLength={3}
                  placeholder="24"
                  placeholderTextColor="#9a9ea5"
                />
                <Text style={s.unit}>°C</Text>
              </View>
              <GlossButton label="Send" style={{ width: 110 }} disabled={!temp.trim()} onPress={() => run((d) => sendWeather(d, `${temp.trim()}C`))} />
            </View>

            {fwd.supported && (
              <>
                <SectionLabel>Phone alerts</SectionLabel>
                <ListCard>
                  <ListRow
                    icon="call-outline"
                    title="Calls"
                    subtitle={fwd.callPerm ? 'Caller name on the watch' : 'Needs phone permission'}
                    right={
                      fwd.callPerm ? (
                        <Switch value={fwd.forwardCalls} onValueChange={fwd.setForwardCalls} trackColor={{ true: colors.green }} />
                      ) : (
                        <Pressable onPress={fwd.requestCallPermissions}>
                          <Text style={s.link}>Allow</Text>
                        </Pressable>
                      )
                    }
                  />
                  <ListRow
                    last
                    icon="notifications-outline"
                    title="Notifications"
                    subtitle={fwd.notifAccess ? 'WhatsApp, SMS and more' : 'Needs access'}
                    right={
                      fwd.notifAccess ? (
                        <Switch value={fwd.forwardNotifs} onValueChange={fwd.setForwardNotifs} trackColor={{ true: colors.green }} />
                      ) : (
                        <Pressable onPress={fwd.openNotificationSettings}>
                          <Text style={s.link}>Enable</Text>
                        </Pressable>
                      )
                    }
                  />
                </ListCard>
                {fwd.last && (
                  <Text style={s.last}>
                    Last sent: <Text style={{ color: colors.greenDark, fontWeight: '600' }}>{fwd.last}</Text>
                  </Text>
                )}
              </>
            )}

            <SectionLabel>Send a message</SectionLabel>
            <View style={s.chips}>
              {QUICK_MESSAGES.map((m) => (
                <Pressable key={m} style={s.chip} onPress={() => setMessage(m)}>
                  <Text style={s.chipText}>{m}</Text>
                </Pressable>
              ))}
            </View>
            <View style={[s.input, { flexDirection: 'row', alignItems: 'center' }]}>
              <TextInput
                style={s.inputText}
                value={message}
                onChangeText={setMessage}
                placeholder="Type a message"
                placeholderTextColor="#9a9ea5"
                maxLength={40}
              />
              <Text style={s.count}>{message.length}/40</Text>
            </View>
            <View style={s.inline}>
              <GlossButton label="Send" style={{ flex: 1 }} disabled={!message.trim()} onPress={() => run((d) => sendNotification(d, message.trim()))} />
              <GlossButton label="Dismiss" variant="outline" style={{ flex: 1 }} onPress={() => run(clearNotification)} />
            </View>
            {error && <Text style={s.error}>{error}</Text>}
          </>
        )}
      </ScrollView>

      <View style={s.footer}>
        {connected ? (
          <GlossButton label="Disconnect" variant="outline" onPress={disconnect} />
        ) : (
          <GlossButton label={busy ? 'Searching…' : 'Scan & connect'} disabled={busy} onPress={connect} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 24 : 48 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.6, color: colors.ink, marginTop: 14 },
  sub: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 22 },
  subText: { fontSize: 13.5, color: colors.muted },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.green },
  dotOff: { backgroundColor: '#bbb' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyCircle: { width: 96, height: 96, borderRadius: 48, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: colors.ink, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21 },
  clock: { fontSize: 46, fontWeight: '800', letterSpacing: -1, color: '#fff', textShadowColor: 'rgba(3,64,31,0.4)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  ampm: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13, color: '#e2ffee', marginTop: 6 },
  battery: { fontSize: 26, fontWeight: '800', color: '#fff' },
  barTrack: { width: 84, height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: '#fff' },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16, marginBottom: 12 },
  inputText: { flex: 1, fontSize: 14.5, paddingVertical: 14, color: colors.ink },
  unit: { color: colors.muted, fontSize: 14.5 },
  count: { color: '#9a9ea5', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.greenTint, borderWidth: 1, borderColor: colors.greenTintBorder },
  chipText: { fontSize: 13, color: colors.ink },
  link: { fontSize: 13, fontWeight: '700', color: colors.greenDark, textDecorationLine: 'underline' },
  last: { fontSize: 12.5, color: colors.muted, marginTop: 10 },
  error: { color: colors.danger, marginTop: 12, textAlign: 'center' },
  footer: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8, backgroundColor: colors.bg },
});
