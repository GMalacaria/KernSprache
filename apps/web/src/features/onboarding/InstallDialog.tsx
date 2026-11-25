import { useEffect, useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { type InstallMode, promptInstall } from '../../lib/install'

interface InstallDialogProps {
  open: boolean
  mode: InstallMode
  onClose: () => void
}

/** How to install the app: the system dialog on Android, the Share steps on iOS. */
export function InstallDialog({ open, mode, onClose }: InstallDialogProps) {
  const { t } = useTranslation(['onboarding', 'common'])
  const ref = useRef<HTMLDialogElement>(null)
  const visible = open && mode !== null

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (visible && !dialog.open) dialog.showModal()
    if (!visible && dialog.open) dialog.close()
  }, [visible])

  async function install() {
    onClose()
    try {
      await promptInstall()
    } catch {
      // The browser refused the dialog: the home entry stays available to retry.
    }
  }

  return (
    <dialog ref={ref} className="install-dialog" aria-labelledby="install-title" onClose={onClose}>
      <h2 id="install-title">{t('install.title')}</h2>
      <p>{t('install.why')}</p>
      {mode === 'ios' ? (
        <>
          <ol className="install-steps">
            <li>
              <Trans t={t} i18nKey="install.iosShare" components={{ strong: <strong /> }} />
            </li>
            <li>
              <Trans t={t} i18nKey="install.iosAdd" components={{ strong: <strong /> }} />
            </li>
            <li>
              <Trans t={t} i18nKey="install.iosConfirm" components={{ strong: <strong /> }} />
            </li>
          </ol>
          <p className="muted">{t('install.iosSignInAgain')}</p>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              {t('common:actions.gotIt')}
            </button>
          </div>
        </>
      ) : (
        <div className="dialog-actions">
          <button type="button" className="link" onClick={onClose}>
            {t('common:actions.notNow')}
          </button>
          <button type="button" onClick={() => void install()}>
            {t('install.install')}
          </button>
        </div>
      )}
    </dialog>
  )
}
