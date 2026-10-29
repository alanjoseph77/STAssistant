import { useCallback, useEffect, useRef, useState } from 'react';
import { Device } from 'react-native-ble-plx';
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

export type Status = 'idle' | 'scanning' | 'connecting' | 'connected';

export function useWatch() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [voltage, setVoltage] = useState<number | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const subsRef = useRef<{ remove(): void }[]>([]);

  const cleanup = useCallback(() => {
    subsRef.current.forEach((s) => s.remove());
    subsRef.current = [];
    deviceRef.current = null;
    setBattery(null);
    setVoltage(null);
  }, []);

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
      const dev = await found.connect();
      await dev.discoverAllServicesAndCharacteristics();
      deviceRef.current = dev;

      subsRef.current.push(
        dev.onDisconnected(() => {
          cleanup();
          setStatus('idle');
        }),
        dev.monitorCharacteristicForService(SERVICE_BATTERY, CHAR.batteryLevel, (e, c) => {
          if (!e && c?.value) setBattery(decodeBatteryLevel(c.value));
        }),
        dev.monitorCharacteristicForService(SERVICE_BATTERY, CHAR.batteryVoltage, (e, c) => {
          if (!e && c?.value) setVoltage(decodeBatteryVoltage(c.value));
        }),
      );

      // Initial sync so the watch faces show the right time/date immediately.
      await sendTime(dev);
      await sendDate(dev);
      setStatus('connected');
    } catch (e) {
      manager.stopDeviceScan();
      cleanup();
      setStatus('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [cleanup]);

  const disconnect = useCallback(async () => {
    await deviceRef.current?.cancelConnection().catch(() => {});
  }, []);

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
      manager.stopDeviceScan();
      subsRef.current.forEach((s) => s.remove());
      deviceRef.current?.cancelConnection().catch(() => {});
    },
    [],
  );

  return { status, error, battery, voltage, connect, disconnect, run };
}
