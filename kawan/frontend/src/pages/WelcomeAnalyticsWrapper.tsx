// WelcomeAnalyticsWrapper — renders the real Analytics page during the guided tour
// and overlays a "Finish walkthrough" CTA so the user can advance to /welcome/finished.

import { useNavigate } from 'react-router-dom'
import { useDemoTour } from '../demo/DemoTour'
import { Analytics } from '../shell/pages/Analytics'

export function WelcomeAnalyticsWrapper() {
  const { active } = useDemoTour()
  const navigate = useNavigate()

  return (
    <>
      <Analytics />
      {active && (
        <div className="tour-analytics-cta">
          <button type="button" className="tour-analytics-finish-btn" onClick={() => navigate('/welcome/finished')}>
            Finish walkthrough
          </button>
        </div>
      )}
    </>
  )
}
