package expo.modules.watchbridge

/** Hands notifications from the listener service to the JS module living in the same process. */
object WatchBridgeHub {
  @Volatile
  var notificationSink: ((app: String, title: String, text: String) -> Unit)? = null
}
