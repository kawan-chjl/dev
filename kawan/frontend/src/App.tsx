// App — router root. Declares all routes; Zone 2 and public pages are outside ShellLayout.
// Phase 5: DemoTourProvider wraps everything so the tour context is available app-wide.
// DemoStepBar renders at app level so it persists across all routes during the tour.

import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { DemoStepBar } from './demo/DemoStepBar'
import { DemoTourProvider, useDemoTour } from './demo/DemoTour'
import { Spotlight } from './demo/Spotlight'
import { isWelcomeDismissed } from './demo/welcomeFlag'
import { AuthCallback } from './pages/AuthCallback'
import { Landing } from './pages/Landing'
import { NotFound } from './pages/NotFound'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Welcome } from './pages/Welcome'
import { WelcomeAnalyticsWrapper } from './pages/WelcomeAnalyticsWrapper'
import { WelcomeFinished } from './pages/WelcomeFinished'
import { Analytics } from './shell/pages/Analytics'
import { CommitmentDetail } from './shell/pages/CommitmentDetail'
import { Commitments } from './shell/pages/Commitments'
import { Faq } from './shell/pages/Faq'
import { Home } from './shell/pages/Home'
import { Privacy } from './shell/pages/Privacy'
import { Settings } from './shell/pages/Settings'
import { SettingsAudit } from './shell/pages/SettingsAudit'
import { ShellLayout } from './shell/ShellLayout'
import { HelpButton } from './ui/HelpButton'
import { NewCommitment } from './zone2/NewCommitment'
import { WorkspaceLayout } from './zone2/WorkspaceLayout'

// TourNavigator: watches the current route and advances the tour step automatically
// when the user lands on a key route during the walkthrough.
function TourNavigator() {
  const location = useLocation()
  const { active, currentStep, next } = useDemoTour()

  useEffect(() => {
    if (!active) return
    const path = location.pathname
    // Step 0 (Commitments) -> Step 1 (Create): user clicks "Make a commitment",
    // navigating to /welcome/commitments/new or /commitments/new. Advance on either.
    if (currentStep === 0 && (path === '/welcome/commitments/new' || path === '/commitments/new')) {
      next()
      return
    }
    // Step 1 (Create) -> Step 2 (Workspace): NewCommitment navigates to /workspace/:id.
    // Advance when we land on any /workspace/ path.
    if (currentStep === 1 && path.startsWith('/workspace/')) {
      next(path)
      return
    }
    // Step 2 (Workspace) -> Step 3 (Analytics): user navigates to /welcome/analytics.
    if (currentStep === 2 && path === '/welcome/analytics') {
      next()
      return
    }
    // Step 3 (Analytics) -> Step 4 (Finished): user navigates to /welcome/finished.
    if (currentStep === 3 && path === '/welcome/finished') {
      next()
      return
    }
  }, [location.pathname, active, currentStep, next])

  return null
}

function AppRoutes() {
  const location = useLocation()
  const helpButtonRoutes = new Set(['/home', '/commitments', '/analytics'])
  const showHelpButton = helpButtonRoutes.has(location.pathname)

  return (
    <>
      {/* Tour navigator — watches route changes and advances the step counter */}
      <TourNavigator />
      {/* Floating step bar — rendered above all routes, only visible when tour is active */}
      <DemoStepBar />
      <Spotlight />

      <Routes>
        {/* Zone 0 — public, no shell chrome */}
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/welcome" element={isWelcomeDismissed() ? <Navigate to="/home" replace /> : <Welcome />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Welcome tour routes — use the REAL page components (no duplicate data layers) */}
        <Route path="/welcome/commitments" element={<ShellLayout />}>
          <Route index element={<Commitments />} />
        </Route>
        <Route path="/welcome/commitments/new" element={<NewCommitment />} />
        <Route path="/welcome/analytics" element={<ShellLayout />}>
          <Route index element={<WelcomeAnalyticsWrapper />} />
        </Route>
        <Route path="/welcome/finished" element={<WelcomeFinished />} />

        {/* Zone 2 — full-screen AI workspace, no shell chrome */}
        {/* /commitments/new is Zone 2 (compose/persona full-screen flow, no shell chrome) */}
        <Route path="/commitments/new" element={<NewCommitment />} />
        {/* /new kept as a redirect so in-flight links don't break */}
        <Route path="/new" element={<Navigate to="/commitments/new" replace />} />
        <Route path="/workspace/:id" element={<WorkspaceLayout />} />

        {/* Zone 1 — SaaS shell (topbar + drawer + footer) */}
        <Route element={<ShellLayout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/commitments" element={<Commitments />} />
          <Route path="/commitments/:id" element={<CommitmentDetail />} />
          {/* /timeline redirects to /analytics (v4 rename) */}
          <Route path="/timeline" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          {/* /history is the canonical route; /settings/audit redirects to it */}
          <Route path="/history" element={<SettingsAudit />} />
          <Route path="/settings/audit" element={<Navigate to="/history" replace />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/privacy" element={<Privacy />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      {showHelpButton && <HelpButton />}
    </>
  )
}

export default function App() {
  return (
    <DemoTourProvider>
      <AppRoutes />
    </DemoTourProvider>
  )
}
