import { isIOS, isStandalone, sttSupported } from "../lib/speech"

/**
 * Shows a warning on iOS when speech recognition is unavailable
 * (e.g. in standalone/home-screen mode where Safari restricts the API).
 */
export function IOSBanner() {
  if (!isIOS()) return null
  if (sttSupported()) return null

  const inStandalone = isStandalone()
  return (
    <div className="mx-4 mb-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">
      {inStandalone ? (
        <>
          <strong>Mic not available in home-screen mode.</strong>{" "}
          Open SpeakCoach in Safari instead — tap the share icon then &ldquo;Open in Safari&rdquo;.
        </>
      ) : (
        <>
          <strong>Speech recognition limited on this device.</strong>{" "}
          For best results, use Safari on iOS 16.4 or later. Chrome and Firefox on iPhone use WebKit which may not support the mic API.
        </>
      )}
    </div>
  )
}