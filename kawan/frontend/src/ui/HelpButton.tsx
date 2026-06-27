import { HelpCircle } from 'lucide-react'

interface HelpButtonProps {
  onClick: () => void
}

export function HelpButton({ onClick }: HelpButtonProps) {
  return (
    <button type="button" className="help-button" aria-label="Open demo help" onClick={onClick}>
      <HelpCircle size={24} aria-hidden="true" />
    </button>
  )
}
