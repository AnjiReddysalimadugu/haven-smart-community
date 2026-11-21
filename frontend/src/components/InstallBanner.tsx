import { useInstallPrompt } from '../pwa/install'
import { BottomSheet } from './mobile/primitives'

/** Chromium BIP install + iOS Add to Home Screen guidance. */
export default function InstallBanner() {
  const {
    installed, showAndroidInstall, showIosGuide, iosGuide,
    openIosGuide, closeIosGuide, installAndroid,
  } = useInstallPrompt()

  if (installed) return null

  return (
    <>
      {showAndroidInstall ? (
        <div className="install-banner glass-surface">
          <span>Install Haven for quick access</span>
          <button type="button" className="button button-primary compact" onClick={() => void installAndroid()}>Install</button>
        </div>
      ) : null}
      {showIosGuide && !showAndroidInstall ? (
        <div className="install-banner glass-surface">
          <span>Add Haven to your Home Screen</span>
          <button type="button" className="button ghost compact" onClick={openIosGuide}>How</button>
        </div>
      ) : null}
      <BottomSheet open={iosGuide} title="Install on iPhone" subtitle="Safari only — iOS does not use Android install prompts" onClose={closeIosGuide}>
        <ol className="ios-install-steps">
          <li>Open Haven in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button.</li>
          <li>Choose <b>Add to Home Screen</b>.</li>
          <li>Confirm <b>Add</b>.</li>
        </ol>
        <button type="button" className="button primary full" onClick={closeIosGuide}>Got it</button>
      </BottomSheet>
    </>
  )
}
