// HelpButton — fixed bottom-right button that opens a confirm dialog before starting the walkthrough.
// Visible only on /home, /commitments, /analytics (gated via useLocation in App.tsx).

import { HelpCircle } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from './Button'
import { Modal } from './Modal'

export function HelpButton() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    setOpen(false)
    navigate('/welcome')
  }

  return (
    <>
      <button type="button" className="help-button" aria-label="Start guided walkthrough" onClick={() => setOpen(true)}>
        <HelpCircle size={24} aria-hidden="true" />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} label="Start the walkthrough">
        <div className="help-confirm-dialog">
          <h2 className="help-confirm-title">Take the walkthrough?</h2>
          <p className="help-confirm-body">This will take you through the key features of Kawan step by step.</p>
          <div className="help-confirm-actions">
            <Button variant="primary" onClick={handleConfirm}>
              Start walkthrough
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
