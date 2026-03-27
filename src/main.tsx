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
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // Check for updates every 30 seconds
      setInterval(() => reg.update(), 30000);

      // When a new SW is found, skip waiting and reload
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version ready - tell it to skip waiting
              newWorker.postMessage('SKIP_WAITING');
            }
          });
        }
      });

      // Reload when the new SW takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }).catch(() => {
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
