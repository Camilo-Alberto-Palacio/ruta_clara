import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/atoms/ErrorBoundary.jsx'
import SplashScreen from './components/atoms/SplashScreen.jsx'
import { Capacitor } from '@capacitor/core'

function AppWithSplash() {
  const [splashDone, setSplashDone] = useState(false);
  return (
    <>
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
      <App />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AppWithSplash />
    </ErrorBoundary>
  </StrictMode>,
)

// Gestión de Service Worker:
// En la app nativa (Capacitor/Android), la app carga recursos directamente del APK local (android_asset).
// Un Service Worker dentro del WebView puede causar discrepancias de caché y pantallas blancas.
if (Capacitor.isNativePlatform()) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister();
      }
    }).catch((err) => {
      console.warn('Error al desregistrar Service Worker nativo:', err);
    });
  }
} else if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // En la Web / PWA, sí registrar Service Worker para soporte offline
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service Worker registration skipped:', err);
    });
  });
}


