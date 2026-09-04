// Decoupled notification bus for non-intrusive toast messages (Heurística 1)
export function emitToast(message, type = 'info') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rutaclara-toast', {
            detail: {
                id: 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                message,
                type
            }
        }));
    }
}
