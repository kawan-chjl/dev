// CharacterStagePlaceholder — placeholder for the Live2D character stage (A1).
// NO PixiJS/Live2D import. Shows a framed silhouette + eye motif on --evening backdrop.

export function CharacterStagePlaceholder() {
  return (
    <div className="char-stage-placeholder" role="img" aria-label="Character stage — Live2D coming in A1">
      <div className="char-stage-silhouette" aria-hidden="true">
        {/* Eye motif — the presence glyph */}
        <div className="char-stage-eye">◉</div>
        <div className="char-stage-label">Haru</div>
      </div>
      <span className="char-stage-badge" aria-hidden="true">
        A1 · Live2D
      </span>
    </div>
  )
}
