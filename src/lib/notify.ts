import { useSettings } from '../store/settings'

export const notificationsSupported = () => 'Notification' in window

/** Ask once, from a user gesture (e.g. the first "Start"). */
export function requestNotifyPermission() {
  if (useSettings.getState().notify && notificationsSupported() && Notification.permission === 'default')
    void Notification.requestPermission()
}

/** System notification when the app is in the background; the in-app chime and toast cover the foreground. */
export function notify(title: string, body: string, force = false) {
  if (!useSettings.getState().notify || !notificationsSupported() || Notification.permission !== 'granted') return
  if (!force && document.visibilityState === 'visible' && document.hasFocus()) return
  const options = { body, icon: '/icon-192.png', tag: 'cocon', lang: 'en' }
  try {
    new Notification(title, options)
  } catch {
    // Mobile browsers only allow notifications through the service worker.
    void navigator.serviceWorker?.ready.then((r) => r.showNotification(title, options)).catch(() => {})
  }
}
