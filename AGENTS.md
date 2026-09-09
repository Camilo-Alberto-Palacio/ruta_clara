# AGENTS.md - Constitución y Reglas Obligatorias para Agentes de IA en Ruta Clara

Este archivo define las directrices, principios de diseño, protocolos de despliegue y arquitectura obligatorios que **cualquier agente de inteligencia artificial (AI Agent)** debe cumplir estrictamente al trabajar en este repositorio:

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
- **Libertad de Mapa en Navegación:** Los gestos de arrastre y zoom nunca deben inmovilizarse durante la navegación. Si el usuario aleja o arrastra el mapa, debe respetarse su nivel de zoom y mostrarse el botón flotante `📍 Recentrar al Ciclista` para volver a seguir la posición cuando lo desee.

---

## 4. 🧘 Principio de Minimalismo Radical (Regla del Niño de 7 Años)

- **El Concepto:** Un ciclista en movimiento va en una bicicleta con guantes, bajo el sol, la lluvia o tráfico pesado. La interfaz durante la navegación activa debe ser tan clara, limpia e intuitiva que **hasta un niño de 7 años pueda usarla sin confusión ni manuales**.
- **Reglas de Pantalla de Navegación / Simulación:**
  1. **Barra Inferior de Navegación:** Solo debe contener los datos esenciales (Hora de llegada, distancia restante) y un **máximo de 2 botones de acción**:
     - 🔊 / 🔇 **Un solo botón de Audio:** Para silenciar o activar la guía de voz con un toque.
     - ❌ **Botón "Salir":** Un botón claro y accesible para finalizar el viaje y regresar al mapa.
  2. **Prohibición de Botones Innecesarios en Cabina:**
     - ❌ **NO poner botón de "Recalcular ruta":** El recálculo es **100% automático** en segundo plano cuando el usuario se sale del camino (`handleDynamicReroute`).
     - ❌ **NO poner botón de "Probar asistente de voz":** Es innecesario; la voz habla sola en cada giro y alerta.
     - ❌ **NO poner botón de "Cambiar voz":** La selección de voces pertenece a la configuración previa, jamás a la conducción activa.
  3. **Controles de Simulación:** Máximo una cápsula compacta de 2 controles:
     - `▶` / `⏸`: Pausar / Reanudar el recorrido.
     - `1x` / `2x` / `4x`: Un solo botón cíclico de velocidad (nunca botones separados por cada velocidad).

---

## 5. 🎙️ Dictado por Voz y Accesibilidad con Una Sola Mano

- **Puntos de Acceso:** El dictado por voz debe ser accesible directamente desde:
  1. La tarjeta flotante superior de la pantalla principal (*"¿A dónde quieres ir hoy?"*).
  2. La barra inferior ergonómica fija ([`MobileBottomDock.jsx`](file:///c:/Users/Camilo%20Palacios/Documents/Semillero%20de%20Desarrollo%20de%20software/ruta_clara/src/components/molecules/MobileBottomDock.jsx)) al alcance del pulgar.
  3. El campo de texto de destino en los formularios.
- **Reconocimiento Localizado:** Configurado en español de Colombia (`es-CO`).
- **Respaldo Táctil (Chips Rápidos):** Debido a que el viento o el ruido del tráfico pueden dificultar el reconocimiento, el modal de voz ([`VoiceSearchModal.jsx`](file:///c:/Users/Camilo%20Palacios/Documents/Semillero%20de%20Desarrollo%20de%20software/ruta_clara/src/components/molecules/VoiceSearchModal.jsx)) siempre debe ofrecer chips rápidos de 1 toque (*Alkosto Venecia, Portal Usme, Centro Mayor, Parque El Tunal, Estación Molinos*).
- **Retroalimentación Sonora:** Confirmar por voz e indicación visual la ruta calculada.

---

## 6. 🕳️ Ciencia Ciudadana y Reporte de Huecos / Obstáculos

- **Botón Flotante Rápido (1 Toque):** Botón flotante estilo Waze accesible tanto en el mapa libre como durante la navegación.
- **Reporte Especializado de Baches / Huecos ([`PotholeReportModal.jsx`](file:///c:/Users/Camilo%20Palacios/Documents/Semillero%20de%20Desarrollo%20de%20software/ruta_clara/src/components/molecules/PotholeReportModal.jsx)):**
  - Debe permitir indicar con precisión si el hueco está a la **izquierda**, en el **centro** o a la **derecha** de la vía.
  - Debe soportar captura o subida de evidencia fotográfica.
  - Nivel de severidad vial (*leve*, *moderado*, *crítico*).
- **Persistencia e Higiene de Datos:** Los reportes ciudadanos guardados en `localStorage` caducan automáticamente a los **60 minutos** para mantener el mapa limpio y veraz.

---

## 7. 💻 Convenciones de Entorno (Windows / PowerShell)

- Al ejecutar comandos en el sistema Windows del usuario mediante `run_command`:
  - **Encadenamiento `&&`:** PowerShell rechaza `&&` en ciertas versiones. Utiliza siempre comillas que envuelvan la instrucción en `cmd /c`:
    ```bash
    cmd /c "npm run build && npx cap sync"
    ```
  - **Mensajes de Commit en Git:** Para evitar que PowerShell separe las palabras del mensaje como argumentos individuales de archivo, encierra el comando completo en comillas simples y el mensaje en comillas dobles:
    ```bash
    cmd /c 'git commit -m "feat: tu mensaje aqui"'
    ```
