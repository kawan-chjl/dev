// SignUp — /sign-up now redirects to /sign-in (email/password auth removed).
import { Navigate } from 'react-router-dom'

export function SignUp() {
  return <Navigate to="/sign-in" replace />
}
