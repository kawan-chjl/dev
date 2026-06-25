import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthProvider.tsx'
import { NotificationProvider } from './notifications/NotificationProvider.tsx'

// biome-ignore lint/style/noNonNullAssertion: #root is guaranteed by index.html
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--surface-2)',
                color: 'var(--ink)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-small)'
              },
              success: {
                iconTheme: {
                  primary: 'var(--sage-deep)',
                  secondary: 'var(--surface-2)'
                }
              },
              error: {
                iconTheme: {
                  primary: 'var(--danger)',
                  secondary: 'var(--surface-2)'
                }
              }
            }}
          />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
