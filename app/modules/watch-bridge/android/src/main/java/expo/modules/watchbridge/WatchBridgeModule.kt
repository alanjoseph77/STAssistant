package expo.modules.watchbridge

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.ContactsContract
import android.provider.Settings
import android.telephony.TelephonyManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WatchBridgeModule : Module() {
  private var callReceiver: BroadcastReceiver? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  override fun definition() = ModuleDefinition {
    Name("WatchBridge")

    Events("onNotification", "onCall")

    Function("isNotificationAccessEnabled") {
      val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
      enabled?.contains(context.packageName) == true
    }

    Function("openNotificationAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("startKeepAlive") {
      val intent = Intent(context, WatchKeepAliveService::class.java)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
    }

    Function("stopKeepAlive") {
      context.stopService(Intent(context, WatchKeepAliveService::class.java))
    }

    Function("isIgnoringBatteryOptimizations") {
      val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      power.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:${context.packageName}"))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    OnCreate {
      WatchBridgeHub.notificationSink = { app, title, text ->
        sendEvent("onNotification", mapOf("app" to app, "title" to title, "text" to text))
      }
      registerCallReceiver()
    }

    OnDestroy {
      WatchBridgeHub.notificationSink = null
      unregisterCallReceiver()
    }
  }

  private fun registerCallReceiver() {
    if (callReceiver != null) return
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        val state = when (intent.getStringExtra(TelephonyManager.EXTRA_STATE)) {
          TelephonyManager.EXTRA_STATE_RINGING -> "ringing"
          TelephonyManager.EXTRA_STATE_OFFHOOK -> "offhook"
          TelephonyManager.EXTRA_STATE_IDLE -> "idle"
          else -> return
        }
        // Only delivered when READ_CALL_LOG is granted; the first broadcast often arrives without it.
        val number = intent.getStringExtra("incoming_number")
        sendEvent(
          "onCall",
          mapOf("state" to state, "number" to number, "name" to lookupName(number))
        )
      }
    }
    val filter = IntentFilter(TelephonyManager.ACTION_PHONE_STATE_CHANGED)
    if (Build.VERSION.SDK_INT >= 33) {
      context.registerReceiver(receiver, filter, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(receiver, filter)
    }
    callReceiver = receiver
  }

  private fun unregisterCallReceiver() {
    callReceiver?.let { runCatching { context.unregisterReceiver(it) } }
    callReceiver = null
  }

  private fun lookupName(number: String?): String? {
    if (number.isNullOrBlank()) return null
    if (context.checkSelfPermission(Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
      return null
    }
    val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number))
    context.contentResolver
      .query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)
      ?.use { if (it.moveToFirst()) return it.getString(0) }
    return null
  }
}
