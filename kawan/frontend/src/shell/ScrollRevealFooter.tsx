// ScrollRevealFooter — Layer 4. Warm-dark band, revealed at end of scroll.
// v4: right-aligned single line with middot-separated links.
// Footer copy uses no emdash per design-system.md §7.

export function ScrollRevealFooter() {
  return (
    <footer className="shell-footer" role="contentinfo">
      <div className="shell-footer-inner">
        <div className="shell-footer-row">
          <span className="shell-footer-copy">&copy; 2026 Kawan</span>
          <span className="shell-footer-sep" aria-hidden="true">
            {' '}
            &middot;{' '}
          </span>
          <span className="shell-footer-link">Contact Us</span>
          <span className="shell-footer-sep" aria-hidden="true">
            {' '}
            &middot;{' '}
          </span>
          <span className="shell-footer-link">How it Works</span>
          <span className="shell-footer-sep" aria-hidden="true">
            {' '}
            &middot;{' '}
          </span>
          <span className="shell-footer-link">Privacy Policy</span>
          <span className="shell-footer-sep" aria-hidden="true">
            {' '}
            &middot;{' '}
          </span>
          <span className="shell-footer-link">Terms &amp; Conditions</span>
        </div>
      </div>
    </footer>
  )
}
