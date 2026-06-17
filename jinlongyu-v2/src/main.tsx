import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// #region agent log
const debugLog = (
  location: string,
  message: string,
  data: Record<string, unknown>,
  hypothesisId: string
) => {
  fetch('http://127.0.0.1:7854/ingest/c358ecd3-74fd-4ab3-aafb-d866601ca064', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '6df2ca' },
    body: JSON.stringify({
      sessionId: '6df2ca',
      location,
      message,
      data,
      hypothesisId,
      timestamp: Date.now(),
      runId: 'pre-fix',
    }),
  }).catch(() => {})
}

window.addEventListener('error', (event) => {
  debugLog('main.tsx:error', 'window error', { message: event.message, filename: event.filename }, 'B')
})
window.addEventListener('unhandledrejection', (event) => {
  debugLog(
    'main.tsx:unhandledrejection',
    'unhandled rejection',
    { reason: String(event.reason) },
    'B'
  )
})
// #endregion

const rootEl = document.getElementById('root')
// #region agent log
debugLog(
  'main.tsx:boot',
  'main boot',
  { hasRoot: Boolean(rootEl), href: window.location.href, innerWidth: window.innerWidth },
  'C'
)
// #endregion

if (!rootEl) {
  // #region agent log
  debugLog('main.tsx:no-root', 'missing #root element', {}, 'E')
  // #endregion
  throw new Error('Root element #root not found')
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)

// #region agent log
debugLog('main.tsx:rendered', 'createRoot render called', {}, 'B')
// #endregion
