import React from 'react';

const SHORTCUTS = [
    { key: 'Z', desc: 'Activar / Desactivar Modo Zen (Mapa a pantalla completa)' },
    { key: '1', desc: 'Seleccionar Ruta 1 (🛡️ Blindada / Mayor Seguridad)' },
    { key: '2', desc: 'Seleccionar Ruta 2 (⛰️ Menos Pendiente / Altimetría suave)' },
    { key: '3', desc: 'Seleccionar Ruta 3 (⏱️ Exprés / Trayecto más corto)' },
    { key: 'Espacio', desc: 'Pausar o reanudar simulación del ciclista' },
    { key: 'Esc', desc: 'Cerrar cualquier modal abierto o salir de Modo Zen' },
    { key: '?', desc: 'Abrir / Cerrar esta guía de atajos de teclado' }
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden animate-scale-up text-slate-900 dark:text-slate-100 flex flex-col">
                
                <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-lg">
                            <i className="fa-solid fa-keyboard"></i>
                        </div>
                        <div>
                            <h2 className="text-base font-black">Atajos de Teclado</h2>
                            <p className="text-[11px] text-slate-300">Navega como un experto en escritorio</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center border-none cursor-pointer hover:bg-white/20 transition-colors"
                        title="Cerrar"
                    >
                        <i className="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                        {SHORTCUTS.map((item, idx) => (
                            <div 
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/40 text-xs"
                            >
                                <span className="text-slate-700 dark:text-slate-200 font-medium">
                                    {item.desc}
                                </span>
                                <kbd className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-mono font-bold text-2xs shadow-inner ml-2 flex-shrink-0">
                                    {item.key}
                                </kbd>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs border-none cursor-pointer"
                        >
                            Entendido
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
