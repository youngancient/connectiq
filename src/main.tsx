import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import './index.css'
import App from './App'
import { SectionBoundary } from './components/SectionBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SectionBoundary name="The dashboard">
      <App />
    </SectionBoundary>
  </StrictMode>,
)
