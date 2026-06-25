// CharacterStagePlaceholder — graceful fallback when the Live2D model fails to load.
// NO PixiJS/Live2D import. Shows a calm eye motif on the warm dark stage band.

import { Eye } from 'lucide-react'

export function CharacterStagePlaceholder() {
  return (
    <div className="char-stage-placeholder" role="img" aria-label="Kawan is here">
      <div className="char-stage-silhouette" aria-hidden="true">
        {/* Eye motif — the presence glyph */}
        <div className="char-stage-eye">
          <Eye size={56} strokeWidth={1.25} />
        </div>
        <div className="char-stage-label">Kawan is here</div>
      </div>
    </div>
  )
}
