import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA/offline
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed - app works without it
    });
  });
}

// Prevent pinch zoom on mobile (better app feel)
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Handle Android back button
document.addEventListener('backbutton', () => {
  if (window.history.length > 1) {
    window.history.back();
  }
});
