import React, { useEffect, useRef, useState } from 'react';

/**
 * SplashScreen — Muestra el video de animación al iniciar Ruta Clara.
 * Se oculta automáticamente cuando el video termina o si ocurre un error.
 * El prop `onFinish` se llama para ceder el control a la app principal.
 */
export default function SplashScreen({ onFinish }) {
  const videoRef = useRef(null);
  const [fading, setFading] = useState(false);

  const handleEnd = () => {
    setFading(true);
    // Esperar a que termine la transición CSS antes de desmontar
    setTimeout(onFinish, 600);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Intentar reproducir (puede fallar en algunos navegadores sin interacción)
    video.play().catch(() => {
      // Si el autoplay falla, terminar splash de inmediato
      handleEnd();
    });

    // Seguridad: si el video tarda demasiado (> 8s), saltar
    const timeout = setTimeout(handleEnd, 8000);
    return () => clearTimeout(timeout);
  }, []);

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
        transition: 'opacity 0.6s ease-out',
        pointerEvents: 'all',
      }}
    >
      <video
        ref={videoRef}
        src="/splash.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleEnd}
        onError={handleEnd}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#ffffff',
        }}
      />
    </div>
  );
}
