import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'react-native-ble-plx';
import WatchBridge from '../modules/watch-bridge';
import {
  CHAR,
  DEVICE_NAME,
  SERVICE_BATTERY,
  decodeBatteryLevel,
  decodeBatteryVoltage,
  manager,
  requestPermissions,
  sendDate,
  sendTime,
  waitForPoweredOn,
} from './ble';

export type Status = 'idle' | 'scanning' | 'connecting' | 'connected' | 'reconnecting';

const RETRY_DELAY_MS = 5000;
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useWatch() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [voltage, setVoltage] = useState<number | null>(null);

  const deviceRef = useRef<Device | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const subsRef = useRef<{ remove(): void }[]>([]);
  const wantConnectedRef = useRef(false); // false once the user disconnects on purpose
  const reconnectingRef = useRef(false);

  const clearSubs = useCallback(() => {
    subsRef.current.forEach((s) => s.remove());
    subsRef.current = [];
    deviceRef.current = null;
    setBattery(null);
    setVoltage(null);
  }, []);

  const startSession = useCallback(
    async (dev: Device, onLost: () => void) => {
      await dev.discoverAllServicesAndCharacteristics();
      deviceRef.current = dev;
      deviceIdRef.current = dev.id;
      subsRef.current.push(
        dev.onDisconnected(onLost),
        dev.monitorCharacteristicForService(SERVICE_BATTERY, CHAR.batteryLevel, (e, c) => {
          if (!e && c?.value) setBattery(decodeBatteryLevel(c.value));
        }),
        dev.monitorCharacteristicForService(SERVICE_BATTERY, CHAR.batteryVoltage, (e, c) => {
          if (!e && c?.value) setVoltage(decodeBatteryVoltage(c.value));
        }),
      );
      // Sync on every (re)connect so the watch clock never drifts.
      await sendTime(dev);
      await sendDate(dev);
      WatchBridge.startKeepAlive();
      setStatus('connected');
    },
    [],
  );

  const reconnect = useCallback(async () => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    while (wantConnectedRef.current && deviceIdRef.current) {
      try {
        // autoConnect lets Android connect the moment the watch is back in range, at very low power.
        const dev = await manager.connectToDevice(deviceIdRef.current, { autoConnect: true });
        if (!wantConnectedRef.current) {
          await dev.cancelConnection().catch(() => {});
          break;
        }
        await startSession(dev, onLost);
        break;
      } catch {
        if (!wantConnectedRef.current) break;
        await wait(RETRY_DELAY_MS);
      }
    }
    reconnectingRef.current = false;
  }, [startSession]);

  const onLost = useCallback(() => {
    clearSubs();
    if (wantConnectedRef.current && deviceIdRef.current) {
      setStatus('reconnecting');
      reconnect();
    } else {
      WatchBridge.stopKeepAlive();
      setStatus('idle');
    }
  }, [clearSubs, reconnect]);

  const connect = useCallback(async () => {
    setError(null);
    try {
      if (!(await requestPermissions())) throw new Error('Bluetooth permission denied');
      await waitForPoweredOn();
      setStatus('scanning');

      const found = await new Promise<Device>((resolve, reject) => {
        const timer = setTimeout(() => {
          manager.stopDeviceScan();
          reject(new Error(`${DEVICE_NAME} not found. Is it powered on and nearby?`));
        }, 15000);
        manager.startDeviceScan(null, null, (err, dev) => {
          if (err) {
            clearTimeout(timer);
            reject(err);
          } else if (dev && (dev.name === DEVICE_NAME || dev.localName === DEVICE_NAME)) {
            clearTimeout(timer);
            manager.stopDeviceScan();
            resolve(dev);
          }
        });
      });

      setStatus('connecting');
      wantConnectedRef.current = true;
      const dev = await found.connect();
      await startSession(dev, onLost);
    } catch (e) {
      manager.stopDeviceScan();
      wantConnectedRef.current = false;
      clearSubs();
      WatchBridge.stopKeepAlive();
      setStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [clearSubs, onLost, startSession]);

  const disconnect = useCallback(async () => {
    wantConnectedRef.current = false;
    const id = deviceIdRef.current;
    if (id) await manager.cancelDeviceConnection(id).catch(() => {});
    clearSubs();
    WatchBridge.stopKeepAlive();
    setStatus('idle');
  }, [clearSubs]);

  /** Run a write against the connected device, surfacing errors in state. */
  const run = useCallback(async (fn: (d: Device) => Promise<unknown>) => {
    const dev = deviceRef.current;
    if (!dev) return setError('Not connected');
    try {
      setError(null);
      await fn(dev);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(
    () => () => {
      wantConnectedRef.current = false;
      manager.stopDeviceScan();
      subsRef.current.forEach((s) => s.remove());
    },
    [],
  );

  return { status, error, battery, voltage, connect, disconnect, run };
}
