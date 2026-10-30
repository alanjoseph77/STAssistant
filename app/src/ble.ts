import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, State } from 'react-native-ble-plx';
import { decode, encode } from 'base-64';

// 16-bit UUIDs used by Smart_Table_Assistant.ino. ble-plx needs the full 128-bit form.
const uuid = (short: string) => `0000${short}-0000-1000-8000-00805f9b34fb`;

export const DEVICE_NAME = 'XIAO-Watch';
export const SERVICE_WATCH = uuid('1805');
export const SERVICE_BATTERY = uuid('180f');

export const CHAR = {
  time: uuid('2a2b'), // "HH:MM:SS"            (max 20 bytes)
  date: uuid('2a27'), // "Wed 28 Oct"          (max 20 bytes)
  weather: uuid('2a24'), // "24C" / "24, Clear" (max 40 bytes)
  notify: uuid('2a46'), // text, "CLR" dismisses (max 40 bytes)
  call: uuid('2a47'), // caller ID, "CLR" hangs up (max 20 bytes)
  batteryLevel: uuid('2a19'), // uint8 percent
  batteryVoltage: uuid('2a1a'), // float32 LE volts
} as const;

export const manager = new BleManager();

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version >= 33) {
    // Needed to show the "connected" notification of the background service; the app still works if denied.
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  if (Platform.Version >= 31) {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return res === PermissionsAndroid.RESULTS.GRANTED;
}

export function waitForPoweredOn(): Promise<void> {
  return new Promise((resolve) => {
    const sub = manager.onStateChange((s) => {
      if (s === State.PoweredOn) {
        sub.remove();
        resolve();
      }
    }, true);
  });
}

/** Truncate to the firmware's characteristic size limit (ASCII only, 1 byte/char). */
const clamp = (s: string, max: number) =>
  s.replace(/[^\x20-\x7e]/g, '?').slice(0, max);

export async function writeText(device: Device, char: string, value: string, max: number) {
  await device.writeCharacteristicWithResponseForService(
    SERVICE_WATCH,
    char,
    encode(clamp(value, max)),
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const formatTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
export const formatDate = (d: Date) => `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

export const sendTime = (d: Device, now = new Date()) => writeText(d, CHAR.time, formatTime(now), 20);
export const sendDate = (d: Device, now = new Date()) => writeText(d, CHAR.date, formatDate(now), 20);
export const sendWeather = (d: Device, v: string) => writeText(d, CHAR.weather, v, 40);
export const sendNotification = (d: Device, v: string) => writeText(d, CHAR.notify, v, 40);
export const clearNotification = (d: Device) => writeText(d, CHAR.notify, 'CLR', 40);
export const sendCall = (d: Device, caller: string) => writeText(d, CHAR.call, caller, 20);
export const clearCall = (d: Device) => writeText(d, CHAR.call, 'CLR', 20);

export const decodeBatteryLevel = (b64: string) => decode(b64).charCodeAt(0);

export function decodeBatteryVoltage(b64: string): number {
  const raw = decode(b64);
  const view = new DataView(new ArrayBuffer(4));
  for (let i = 0; i < 4; i++) view.setUint8(i, raw.charCodeAt(i));
  return view.getFloat32(0, true);
}
