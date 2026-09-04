import React from 'react';

const TYPE_CONFIG = {
    success: {
        icon: 'fa-solid fa-circle-check',
        color: '#10b981',
        bg: 'rgba(236, 253, 245, 0.95)',
        border: '#a7f3d0'
    },
    error: {
        icon: 'fa-solid fa-circle-xmark',
        color: '#ef4444',
        bg: 'rgba(254, 242, 242, 0.95)',
        border: '#fecaca'
    },
    warning: {
        icon: 'fa-solid fa-triangle-exclamation',
        color: '#f59e0b',
        bg: 'rgba(255, 251, 235, 0.95)',
        border: '#fde68a'
    },
    info: {
        icon: 'fa-solid fa-circle-info',
        color: '#3b82f6',
        bg: 'rgba(239, 246, 255, 0.95)',
        border: '#bfdbfe'
    }
};

export default function ToastContainer({ toasts = [], onDismiss }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <aside 
            className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
            aria-live="polite"
            aria-atomic="true"
        >
            {toasts.map(toast => {
                const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;
                return (
                    <div
                        key={toast.id}
                        className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl backdrop-blur-xl border transition-all animate-slide-down select-none"
                        style={{
                            background: config.bg,
                            borderColor: config.border,
                            color: '#0f172a'
                        }}
                    >
                        <i 
                            className={`${config.icon} text-base mt-0.5 flex-shrink-0`}
                            style={{ color: config.color }}
                        ></i>
                        <div className="flex-1 text-xs font-semibold leading-relaxed">
                            {toast.message}
                        </div>
                        <button
                            onClick={() => onDismiss && onDismiss(toast.id)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 -mr-1 -mt-1 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                            title="Descartar"
                        >
                            <i className="fa-solid fa-xmark text-xs"></i>
                        </button>
                    </div>
                );
            })}
        </aside>
    );
}
