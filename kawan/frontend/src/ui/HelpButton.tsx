// HelpButton — fixed bottom-right button that launches the guided walkthrough.
// Visible only on /home, /commitments, /analytics (gated via useLocation in App.tsx).

import { HelpCircle } from 'lucide-react'
import { useDemoTour } from '../demo/DemoTour'

export function HelpButton() {
  const { start } = useDemoTour()

  return (
    <button type="button" className="help-button" aria-label="Start guided walkthrough" onClick={start}>
      <HelpCircle size={24} aria-hidden="true" />
    </button>
  )
}
