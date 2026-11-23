import { useState } from 'react'
import { SetPasswordForm } from './SetPasswordForm'

/** Collapsed section of the home screen: change the password while signed in. */
export function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  if (saved) return <p className="muted" style={{ flexBasis: '100%' }}>Password aggiornata.</p>
  if (!open) {
    return (
      <button type="button" className="link" onClick={() => setOpen(true)}>
        Cambia password
      </button>
    )
  }
  return (
    <section className="notice">
      <h2 className="small-heading">Cambia password</h2>
      <SetPasswordForm submitLabel="Salva la password" onDone={() => setSaved(true)} />
    </section>
  )
}
