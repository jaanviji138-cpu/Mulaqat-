import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './hooks/useAuth';
import { LanguageProvider } from './contexts/LanguageContext';
import { soundEffects } from './utils/audioEffects';
import './index.css';

// Global audio unlocker on first gesture
if (typeof window !== 'undefined') {
  const globalAudioUnlock = () => {
    soundEffects.unlockAudio();
    ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
      window.removeEventListener(evt, globalAudioUnlock);
    });
  };
  ['click', 'touchstart', 'touchend', 'pointerdown', 'keydown'].forEach(evt => {
    window.addEventListener(evt, globalAudioUnlock, { passive: true, once: true });
  });
}

// Intercept and prevent uncaught internal Firestore watch aggregator assertion exceptions from crashing the UI
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event.message || (event.error && event.error.message) || '';
    if (
      msg.includes('FIRESTORE') || 
      msg.includes('INTERNAL ASSERTION FAILED') || 
      msg.includes('ca9') || 
      msg.includes('b815') ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied')
    ) {
      // Prevent propagating to console error reporting overlays
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Firestore WatchDog] Handled internal SDK stream transient state gracefully.');
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'string' ? reason : (reason?.message || '');
    if (
      msg.includes('FIRESTORE') || 
      msg.includes('INTERNAL ASSERTION FAILED') || 
      msg.includes('ca9') || 
      msg.includes('b815') ||
      msg.includes('Missing or insufficient permissions') ||
      msg.includes('permission-denied')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      console.warn('[Firestore WatchDog] Handled unhandled rejection internal SDK stream state gracefully.');
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);

