# AGENTS.md - Reglas Obligatorias para Agentes de IA en Ruta Clara

Este archivo define las directrices y protocolos obligatorios que **cualquier agente de inteligencia artificial (AI Agent)** debe cumplir estrictamente al trabajar en este repositorio:

---

## 1. 📱 Sincronización Obligatoria con Android Studio (`Capacitor`)

- **El Problema:** Android Studio únicamente empaqueta los archivos estáticos en `android/app/src/main/assets/public/`. Android Studio **NO compila** el código de React/Vite de forma automática.
- **La Regla:** Siempre que realices cualquier cambio en archivos de frontend (`src/`, `public/`, `index.html`, etc.), debes sincronizar los recursos hacia Android antes de considerar terminada la tarea:
  ```bash
  npm run cap:sync
  ```
  *(O en dos pasos: `npm run build && npx cap sync`)*.
- **Consecuencia de no hacerlo:** El APK compilado en Android Studio cargará la versión anterior sin tus cambios.

---

## 2. 🐙 Sincronización Obligatoria con GitHub tras Cada Chat / Hito

- **La Regla:** Al culminar cualquier solicitud del usuario, requerimiento o sesión de chat, debes confirmar y enviar los cambios al repositorio remoto en GitHub:
  ```bash
  git add .
  git commit -m "feat/fix: descripción concisa y profesional del cambio"
  git push origin main
  ```
- **Consecuencia de no hacerlo:** Los cambios solo existirán en la máquina local del usuario, creando desincronización con el repositorio remoto.

---

## 3. 🎨 Identidad Visual y Experiencia Móvil
- **Paleta de Colores:** Estrictamente **Blanco** (`#ffffff`), neutros claros de slate (`#f8fafc`, `#f1f5f9`) y **Verde Esmeralda** (`#10b981`, `#059669`). No uses fondos oscuros ni negros invasivos.
- **Ubicación GPS Automática:** La aplicación debe tomar la ubicación GPS del usuario (`navigator.geolocation`) por defecto como origen.
- **Libertad de Mapa en Navegación:** Los gestos de arrastre y zoom nunca deben inmovilizarse durante la navegación. Si el usuario arrastra el mapa, debe mostrarse el botón flotante `📍 Recentrar al Ciclista`.
