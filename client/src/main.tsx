// ============================================================================
// Application Entry Point
// ============================================================================
// This is where React mounts into the DOM.
// StrictMode enables additional development checks and warnings.
// ============================================================================

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
