# Smart Table Assistant – Android app (Expo)

Controls the [Smart Table Assistant](https://github.com/PinToCode/Smart-Table-Assistant-) firmware over BLE:
sync time/date, send weather, push notifications, trigger call alerts, and read battery level/voltage.

BLE needs native code, so **Expo Go will not work**. Use a development build.

```bash
cd app
npm install
npx expo run:android      # local build, phone connected via USB (needs Android SDK)
# or, without a local SDK:
npx eas-cli@latest build --profile development --platform android
```

Then power on the device (it advertises as `XIAO-Watch`) and tap **Scan & Connect**.

## BLE map (matches `Smart_Table_Assistant.ino`)

| Characteristic | UUID | Value |
| --- | --- | --- |
| time | `2A2B` | `HH:MM:SS` (24h) |
| date | `2A27` | `Wed 28 Oct` |
| weather | `2A24` | `24C` or `24, Clear` |
| notify | `2A46` | text ≤ 40 chars, `CLR` dismisses |
| call | `2A47` | caller ≤ 20 chars, `CLR` hangs up |
| battery level | `2A19` (svc `180F`) | uint8 % |
| battery voltage | `2A1A` (svc `180F`) | float32 LE volts |

Code: `src/ble.ts` (UUIDs, encoding), `src/useWatch.ts` (scan/connect/state), `App.tsx` (UI).
