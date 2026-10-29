import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import { Device } from 'react-native-ble-plx';
import WatchBridge from '../modules/watch-bridge';
import { clearCall, sendCall, sendNotification } from './ble';

type Run = (fn: (d: Device) => Promise<unknown>) => Promise<void>;

const CALL_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
];

/** Forwards real phone calls and notifications from this phone to the watch. */
export function useForwarding(connected: boolean, run: Run) {
  const android = Platform.OS === 'android';
  const [notifAccess, setNotifAccess] = useState(false);
  const [callPerm, setCallPerm] = useState(false);
  const [forwardCalls, setForwardCalls] = useState(true);
  const [forwardNotifs, setForwardNotifs] = useState(true);
  const [last, setLast] = useState<string | null>(null);

  const runRef = useRef(run);
  runRef.current = run;

  const refresh = useCallback(async () => {
    if (!android) return;
    setNotifAccess(WatchBridge.isNotificationAccessEnabled());
    const checks = await Promise.all(CALL_PERMISSIONS.map((p) => PermissionsAndroid.check(p)));
    setCallPerm(checks[0]); // READ_PHONE_STATE is the one required to see calls at all
  }, [android]);

  useEffect(() => {
    refresh();
    // The user comes back from the system settings screen via AppState.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const requestCallPermissions = useCallback(async () => {
    await PermissionsAndroid.requestMultiple(CALL_PERMISSIONS);
    refresh();
  }, [refresh]);

  const openNotificationSettings = useCallback(() => WatchBridge.openNotificationAccessSettings(), []);

  useEffect(() => {
    if (!android || !connected) return;
    let ringingLabel: string | null = null;
    let lastNotif = { text: '', at: 0 };

    const callSub = WatchBridge.addListener('onCall', (e) => {
      if (!forwardCalls) return;
      if (e.state === 'ringing') {
        const label = e.name || e.number || 'Unknown caller';
        if (label === ringingLabel) return; // the OS sends several broadcasts per call
        ringingLabel = label;
        setLast(`Call: ${label}`);
        runRef.current((d) => sendCall(d, label));
      } else if (ringingLabel) {
        ringingLabel = null;
        runRef.current(clearCall);
      }
    });

    const notifSub = WatchBridge.addListener('onNotification', (e) => {
      if (!forwardNotifs) return;
      const text = [e.title, e.text].filter(Boolean).join(': ');
      const now = Date.now();
      if (text === lastNotif.text && now - lastNotif.at < 3000) return;
      lastNotif = { text, at: now };
      setLast(`${e.app}: ${text}`);
      runRef.current((d) => sendNotification(d, text));
    });

    return () => {
      callSub.remove();
      notifSub.remove();
    };
  }, [android, connected, forwardCalls, forwardNotifs]);

  return {
    supported: android,
    notifAccess,
    callPerm,
    forwardCalls,
    forwardNotifs,
    setForwardCalls,
    setForwardNotifs,
    requestCallPermissions,
    openNotificationSettings,
    last,
  };
}
