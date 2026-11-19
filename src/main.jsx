import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import GenieApp from './redesign/GenieApp.jsx'

// Open the app with ?ui=new for the redesigned UI; the classic UI stays the default.
const useRedesign = new URLSearchParams(window.location.search).get('ui') === 'new'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {useRedesign ? <GenieApp /> : <App />}
  </StrictMode>,
)
