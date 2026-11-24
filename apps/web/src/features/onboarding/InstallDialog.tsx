import { useEffect, useRef } from 'react'
import { type InstallMode, promptInstall } from '../../lib/install'

interface InstallDialogProps {
  open: boolean
  mode: InstallMode
  onClose: () => void
}

/** How to install the app: the system dialog on Android, the Share steps on iOS. */
export function InstallDialog({ open, mode, onClose }: InstallDialogProps) {
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
      <h2 id="install-title">Installa Kern Sprache sul telefono</h2>
      <p>L'app sta nella schermata Home e si apre senza la barra del browser. Serve anche per ricevere i promemoria.</p>
      {mode === 'ios' ? (
        <>
          <ol className="install-steps">
            <li>
              Tocca <strong>Condividi</strong> (il quadrato con la freccia verso l'alto).
            </li>
            <li>
              Scegli <strong>Aggiungi alla schermata Home</strong>.
            </li>
            <li>
              Tocca <strong>Aggiungi</strong>, poi apri l'app dall'icona.
            </li>
          </ol>
          <p className="muted">Alla prima apertura dall'icona dovrai accedere di nuovo con email e password.</p>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Ho capito
            </button>
          </div>
        </>
      ) : (
        <div className="dialog-actions">
          <button type="button" className="link" onClick={onClose}>
            Non ora
          </button>
          <button type="button" onClick={() => void install()}>
            Installa
          </button>
        </div>
      )}
    </dialog>
  )
}
