import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import './index.css'
import App from './App'
import { SectionBoundary } from './components/SectionBoundary'
import { BriefPage } from './pages/BriefPage'

// Two pages, no router library: the explainer lives at /about (and the older /brief);
// everything else is the dashboard.
const path = window.location.pathname.replace(/\/+$/, '')
const isBrief = path === '/about' || path === '/brief'
if (isBrief) document.title = 'How it works · ConnectIQ'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SectionBoundary name={isBrief ? 'How it works' : 'The dashboard'}>
      {isBrief ? <BriefPage /> : <App />}
    </SectionBoundary>
  </StrictMode>,
)
