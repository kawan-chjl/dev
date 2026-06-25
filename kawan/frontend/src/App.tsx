// App — router root. Declares all routes; Zone 2 and public pages are outside ShellLayout.
// Q1 resolution: repurpose this file as real app shell (spike intent preserved in spike/ dir).

import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthCallback } from './pages/AuthCallback'
import { Landing } from './pages/Landing'
import { NotFound } from './pages/NotFound'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { Welcome } from './pages/Welcome'
import { CommitmentDetail } from './shell/pages/CommitmentDetail'
import { Commitments } from './shell/pages/Commitments'
import { Faq } from './shell/pages/Faq'
import { Home } from './shell/pages/Home'
import { Settings } from './shell/pages/Settings'
import { SettingsAudit } from './shell/pages/SettingsAudit'
import { Timeline } from './shell/pages/Timeline'
import { ShellLayout } from './shell/ShellLayout'
import { NewCommitment } from './zone2/NewCommitment'
import { WorkspaceLayout } from './zone2/WorkspaceLayout'

export default function App() {
  return (
    <Routes>
      {/* Zone 0 — public, no shell chrome */}
      <Route path="/" element={<Landing />} />
      <Route path="/sign-in" element={<SignIn />} />
      <Route path="/sign-up" element={<SignUp />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

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
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/settings" element={<Settings />} />
        {/* /history is the canonical route; /settings/audit redirects to it */}
        <Route path="/history" element={<SettingsAudit />} />
        <Route path="/settings/audit" element={<Navigate to="/history" replace />} />
        <Route path="/faq" element={<Faq />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
