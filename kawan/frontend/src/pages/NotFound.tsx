// 404 — catch-all route
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="not-found-root">
      <div className="not-found-eye" aria-hidden="true">
        ◉
      </div>
      <h1 className="not-found-heading">404</h1>
      <p className="not-found-sub">Kawan can't find what you're looking for.</p>
      <Button variant="primary" onClick={() => navigate('/home')}>
        Go home
      </Button>
    </div>
  )
}
