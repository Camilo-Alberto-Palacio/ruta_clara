import React, { useEffect, useState } from 'react';

/**
 * SplashScreen — Muestra la animación al iniciar Ruta Clara usando WebP animado.
 * Al usar <img> en lugar de <video> no aparece ningún ícono ni control de reproducción.
 * El prop `onFinish` se llama cuando termina la animación o el timeout de seguridad.
 *
 * Duración de la animación: ~10s (igual al video original, reducido a 15fps y 480px).
 * Peso: ~478 KB (vs 1.4 MB del MP4 original).
 */

// Duración de la animación del WebP en milisegundos
const SPLASH_DURATION_MS = 10000;
// Duración del fade-out en ms
const FADE_DURATION_MS = 600;

export default function SplashScreen({ onFinish }) {
  const [fading, setFading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const handleFinish = () => {
    setFading(true);
    setTimeout(onFinish, FADE_DURATION_MS);
  };

  useEffect(() => {
    // Timeout de seguridad: si el WebP no carga en 2s, arrancamos el timer igual
    const safetyLoad = setTimeout(() => setLoaded(true), 2000);
    return () => clearTimeout(safetyLoad);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    // Una vez cargado, esperar la duración completa del WebP y luego hacer fade-out
    const timer = setTimeout(handleFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [loaded]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        pointerEvents: 'all',
      }}
    >
      <img
        src="/splash.webp"
        alt="Ruta Clara - cargando..."
        onLoad={() => setLoaded(true)}
        onError={handleFinish}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
