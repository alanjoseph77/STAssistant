# Publishing DeskMate on Google Play

This is a checklist. Everything in the repository is ready for it, but Google reviews each app by hand.

## 1. Before you start

- A Google Play developer account (one-time fee). Accounts created recently must also run a **closed test with a minimum number of testers for 14 days** before production; check the current numbers in Play Console.
- Your own **upload key** (a keystore). Create it once and keep it safe. Losing it makes updates painful.

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore deskmate-upload.jks -alias deskmate \
  -keyalg RSA -keysize 2048 -validity 10000
```

Never commit the `.jks` file.

## 2. Build a signed app bundle (.aab)

Play requires an **AAB**, not an APK.

**On GitHub (easiest):** add these repository secrets under *Settings → Secrets and variables → Actions*:

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | the keystore as base64 (`base64 -w0 deskmate-upload.jks`, or on Windows `[Convert]::ToBase64String([IO.File]::ReadAllBytes("deskmate-upload.jks"))`) |
| `ANDROID_KEYSTORE_PASSWORD` | the keystore password |
| `ANDROID_KEY_ALIAS` | `deskmate` |
| `ANDROID_KEY_PASSWORD` | the key password |

Then push a tag, for example `git tag v1.0.0 && git push origin v1.0.0`. The workflow builds `app-release.aab` and
`app-release.apk` and attaches them to a GitHub release. Download the `.aab`.

**Locally:** set `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS` and `RELEASE_KEY_PASSWORD`, then run
`./gradlew bundleRelease` in `app/android`. The file is `app/android/app/build/outputs/bundle/release/app-release.aab`.

Raise `android.versionCode` in `app/app.json` for every upload.

## 3. Play Console

1. Create the app, choose **Play App Signing** and upload the AAB to **Internal testing** first.
2. **Store listing:** name *DeskMate*, short and full description, the 512×512 icon (`app/assets/icon.png` is 1024×1024; export a 512 copy),
   a 1024×500 feature graphic and at least 2 phone screenshots. **Use real screenshots from your phone.**
3. **Privacy policy URL:** `https://github.com/alanjoseph77/STAssistant/blob/main/PRIVACY.md`
4. **Data safety form:** the app collects no data and shares none. Calls and notifications are processed on the device and sent only to
   the user's own Bluetooth accessory.
5. **Content rating** questionnaire, **target audience** (not for children), **ads**: none.

## 4. Permission declarations (the hard part)

Google restricts some permissions and asks you to justify them. DeskMate uses:

| Permission | Policy | What to say |
| --- | --- | --- |
| `READ_CALL_LOG` | **Restricted.** Normally only for the default phone or SMS app. | Needed to read the incoming number so a companion device can show the caller. Core feature of the paired accessory. Expect close review. |
| `READ_CONTACTS` | Sensitive | Only to look up the caller's name for the watch. Not stored or uploaded. |
| Notification listener | Sensitive | Core feature: shows notifications on the paired watch. Not stored or uploaded. |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Restricted use | Needed so the Bluetooth connection to the companion device is not killed. |
| Foreground service `connectedDevice` | Declaration required | Keeps the Bluetooth connection to the user's watch alive. |

**Be aware:** Google may reject `READ_CALL_LOG`. If it does, the fallback is to remove `READ_CALL_LOG` and `READ_CONTACTS`; the watch then
shows "Incoming call" without the number or name. Ask and I will build that variant.

Record a short screen video of the app showing each feature, as the declaration forms ask for one.

## 4b. Test before every release

- Fresh install on a real phone, then connect, sync time, send a message.
- A real incoming call and a real notification, with the screen locked.
- Turn Bluetooth off and on, move the watch out of range and back: it should reconnect by itself.
- Swipe the app away from recent apps and see what happens.

## 5. Release

Internal testing → closed test → production. Each release needs a higher version code.
