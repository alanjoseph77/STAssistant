package expo.modules.watchbridge

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

class WatchNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    if (sbn.packageName == packageName || sbn.isOngoing) return

    val notification = sbn.notification
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    when (notification.category) {
      Notification.CATEGORY_CALL,
      Notification.CATEGORY_TRANSPORT,
      Notification.CATEGORY_PROGRESS,
      Notification.CATEGORY_SERVICE,
      Notification.CATEGORY_SYSTEM -> return
    }

    val extras = notification.extras
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    if (title.isBlank() && text.isBlank()) return

    val appName = try {
      packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
    } catch (e: Exception) {
      sbn.packageName
    }

    WatchBridgeHub.notificationSink?.invoke(appName, title, text)
  }
}
