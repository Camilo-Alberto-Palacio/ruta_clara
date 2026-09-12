import React, { useEffect, useState } from 'react';

/**
 * SplashScreen — Ventana de carga de Ruta Clara.
 *
 * Muestra la animación WebP (1 sola reproducción, sin loop) junto con
 * una barra de progreso verde que avanza de 0 → 100% en SPLASH_DURATION_MS.
 * Al llegar a 100% hace fade-out y llama a `onFinish` para pasar a la app.
 */

const SPLASH_DURATION_MS = 10000; // Duración de la animación WebP (10s)
const FADE_DURATION_MS   = 700;   // Duración del fade-out al finalizar
const TICK_MS            = 50;    // Cada cuánto ms actualizar el progreso

export default function SplashScreen({ onFinish }) {
  const [progress, setProgress]   = useState(0);
  const [fading, setFading]       = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Una vez que la imagen cargó, arrancamos el progreso
  useEffect(() => {
    // Timeout de seguridad: empezar aunque la imagen tarde en cargar
    const safetyTimer = setTimeout(() => setImgLoaded(true), 1500);
    return () => clearTimeout(safetyTimer);
  }, []);

  useEffect(() => {
    if (!imgLoaded) return;

    const startTime = performance.now();

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min((elapsed / SPLASH_DURATION_MS) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        setFading(true);
        setTimeout(onFinish, FADE_DURATION_MS);
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [imgLoaded, onFinish]);

  const pctRound = Math.round(progress);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        pointerEvents: 'all',
        padding: '24px',
        gap: '0px',
      }}
    >
      {/* ── Animación principal ── */}
      <img
        src="/splash.webp"
        alt="Ruta Clara"
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(true)}
        style={{
          width: '100%',
          maxWidth: '420px',
          objectFit: 'contain',
          flex: 1,
          minHeight: 0,
        }}
      />

      {/* ── Bloque inferior de carga ── */}
      <div style={{
        width: '100%',
        maxWidth: '340px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '32px',
      }}>
        {/* Nombre de la app */}
        <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
          <div style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#059669',
            letterSpacing: '-0.5px',
          }}>
            Ruta Clara
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: 500,
            marginTop: '2px',
          }}>
            Navegación segura para ciclistas
          </div>
        </div>

        {/* Barra de progreso */}
        <div style={{ width: '100%' }}>
          {/* Track */}
          <div style={{
            width: '100%',
            height: '6px',
            borderRadius: '99px',
            background: '#e5e7eb',
            overflow: 'hidden',
          }}>
            {/* Fill */}
            <div style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: '99px',
              background: 'linear-gradient(90deg, #34d399, #059669)',
              transition: 'width 50ms linear',
              boxShadow: progress > 5 ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
            }} />
          </div>

          {/* Porcentaje */}
          <div style={{
            textAlign: 'right',
            marginTop: '6px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#059669',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {pctRound < 100 ? `Cargando... ${pctRound}%` : '¡Listo! 100%'}
          </div>
        </div>
      </div>
    </div>
  );
}

