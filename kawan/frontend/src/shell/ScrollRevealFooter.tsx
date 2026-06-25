// ScrollRevealFooter — Layer 4. Warm-dark band, revealed at end of scroll.
// v4 hotfix: two-row right-aligned footer — logo lockup + clickable link row.
// All links point to "/" as placeholder targets until real pages exist.
// Footer copy uses no emdash per design-system.md §7.

import { Link } from 'react-router-dom'

export function ScrollRevealFooter() {
  return (
    <footer className="shell-footer" role="contentinfo">
      <div className="shell-footer-inner">
        {/* Row 1: Logo lockup */}
        <div className="shell-footer-row shell-footer-row-logo">
          <Link to="/" className="shell-footer-logo-link" aria-label="Kawan home">
            <img src="/kawan-logo.png" alt="" className="shell-footer-logo-img" width={26} height={26} />
            <span className="shell-footer-logo-name">Kawan</span>
          </Link>
        </div>
        {/* Row 2: Link row */}
        <div className="shell-footer-row shell-footer-row-links">
          <Link to="/" className="shell-footer-link">
            &copy; 2026 Kawan
          </Link>
          <span className="shell-footer-sep" aria-hidden="true">
            &middot;
          </span>
          <Link to="/" className="shell-footer-link">
            Contact Us
          </Link>
          <span className="shell-footer-sep" aria-hidden="true">
            &middot;
          </span>
          <Link to="/" className="shell-footer-link">
            How it Works
          </Link>
          <span className="shell-footer-sep" aria-hidden="true">
            &middot;
          </span>
          <Link to="/" className="shell-footer-link">
            Privacy Policy
          </Link>
          <span className="shell-footer-sep" aria-hidden="true">
            &middot;
          </span>
          <Link to="/" className="shell-footer-link">
            Terms &amp; Conditions
          </Link>
        </div>
      </div>
    </footer>
  )
}
