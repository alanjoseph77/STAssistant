import { NativeModule, requireNativeModule } from 'expo';

export type CallEvent = {
  state: 'ringing' | 'offhook' | 'idle';
  number: string | null;
  name: string | null;
};

export type NotificationEvent = { app: string; title: string; text: string };

type WatchBridgeEvents = {
  onCall: (e: CallEvent) => void;
  onNotification: (e: NotificationEvent) => void;
};

declare class WatchBridgeModule extends NativeModule<WatchBridgeEvents> {
  isNotificationAccessEnabled(): boolean;
  openNotificationAccessSettings(): void;
  startKeepAlive(): void;
  stopKeepAlive(): void;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): void;
}

export default requireNativeModule<WatchBridgeModule>('WatchBridge');
