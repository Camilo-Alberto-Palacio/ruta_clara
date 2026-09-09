/**
 * Picture-in-Picture (PiP) Helper Service for Ruta Clara
 * Enables floating mini-map navigation window over other applications.
 */

class PipService {
    constructor() {
        this.videoElement = null;
        this.stream = null;
        this.isActive = false;
    }

    isSupported() {
        if (typeof document === 'undefined') return false;
        return Boolean(document.pictureInPictureEnabled || 'documentPictureInPicture' in window);
    }

    async startCanvasPip(canvas, fps = 15) {
        if (!canvas) return false;

        try {
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.muted = true;
                this.videoElement.playsInline = true;
                this.videoElement.style.position = 'fixed';
                this.videoElement.style.top = '-9999px';
                this.videoElement.style.left = '-9999px';
                this.videoElement.style.width = '1px';
                this.videoElement.style.height = '1px';
                document.body.appendChild(this.videoElement);

                this.videoElement.addEventListener('leavepictureinpicture', () => {
                    this.isActive = false;
                });
            }

            if (canvas.captureStream) {
                this.stream = canvas.captureStream(fps);
                this.videoElement.srcObject = this.stream;
                await this.videoElement.play();
                await this.videoElement.requestPictureInPicture();
                this.isActive = true;
                return true;
            }
        } catch (err) {
            console.warn('[PipService] No se pudo iniciar Picture-in-Picture:', err);
        }
        return false;
    }

    async exitPip() {
        if (typeof document !== 'undefined' && document.pictureInPictureElement) {
            try {
                await document.exitPictureInPicture();
            } catch (err) {
                console.warn('[PipService] Error al salir de PiP:', err);
            }
        }
        this.isActive = false;
    }
}

export const pipService = new PipService();
