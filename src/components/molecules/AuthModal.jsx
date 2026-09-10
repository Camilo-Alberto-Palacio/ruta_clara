import React, { useState } from 'react';
import { authService } from '../../services/authService';

export default function AuthModal({
    isOpen,
    onClose,
    currentUser,
    userReportsCount = 0,
    showToast = () => {}
}) {
    const [isLoading, setIsLoading] = useState(false);
    const isFirebaseReady = authService.isFirebaseReady();

    if (!isOpen) return null;

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            if (isFirebaseReady) {
                await authService.loginWithGoogle();
                showToast("🎉 ¡Sesión iniciada con Google exitosamente!", "success");
                onClose();
            } else {
                // Fallback amigable si aún no se han configurado credenciales en .env
                authService.loginDemoUser({
                    displayName: 'Camilo Palacios (Google)',
                    email: 'camilo.palacios@ejemplo.com'
                });
                showToast("✨ Conectado en Modo Demostración de Google", "info");
                onClose();
            }
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                showToast("Has cerrado la ventana de inicio de sesión de Google.", "warning");
            } else {
                showToast("No se pudo iniciar sesión con Google. Revisa tu conexión o credenciales.", "error");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDemoLogin = () => {
        authService.loginDemoUser();
        showToast("✨ Has ingresado como Ciclista Ciudadano en modo de prueba", "info");
        onClose();
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await authService.logout();
            showToast("👋 Has cerrado sesión correctamente", "info");
            onClose();
        } catch (err) {
            console.error("Error al cerrar sesión:", err);
            showToast("Error cerrando sesión.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 relative overflow-hidden animate-scale-up"
                style={{ boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Botón cerrar modal */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer border-none"
                    aria-label="Cerrar modal"
                >
                    <i className="fa-solid fa-xmark text-base"></i>
                </button>

                {currentUser ? (
                    /* --- ESTADO AUTENTICADO (PERFIL DE USUARIO) --- */
                    <div className="flex flex-col items-center text-center">
                        <div className="relative mb-3 mt-1">
                            {currentUser.photoURL ? (
                                <img 
                                    src={currentUser.photoURL} 
                                    alt={currentUser.displayName} 
                                    className="w-20 h-20 rounded-full object-cover border-3 border-emerald-500 shadow-md"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl font-black border-3 border-emerald-500 shadow-md">
                                    {(currentUser.displayName || 'U').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div 
                                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-xs" 
                                title="En línea"
                            >
                                <i className="fa-solid fa-check text-white text-2xs"></i>
                            </div>
                        </div>

                        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-0.5">
                            {currentUser.displayName}
                        </h2>
                        <p className="text-xs text-slate-500 mb-3 font-medium">
                            {currentUser.email}
                        </p>

                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-5">
                            <i className="fa-solid fa-bicycle text-xs"></i>
                            <span>{currentUser.role || 'Ciclista Ciudadano'}</span>
                        </div>

                        {/* Tarjeta de métricas comunitarias */}
                        <div className="w-full bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-left">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-base">
                                        <i className="fa-solid fa-shield-heart"></i>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 font-bold m-0">Aportes a la comunidad</p>
                                        <p className="text-lg font-black text-slate-900 m-0">
                                            {userReportsCount} {userReportsCount === 1 ? 'reporte' : 'reportes'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-2xs font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                                    Nivel 1
                                </span>
                            </div>
                            <p className="text-2xs text-slate-400 mt-2 m-0">
                                Tus reportes de baches y luminarias ayudan a pedalear más seguro por Bogotá.
                            </p>
                        </div>

                        {/* Botón Cerrar Sesión */}
                        <button
                            onClick={handleLogout}
                            disabled={isLoading}
                            className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-rose-200 active:scale-98"
                        >
                            <i className="fa-solid fa-arrow-right-from-bracket"></i>
                            <span>{isLoading ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
                        </button>
                    </div>
                ) : (
                    /* --- ESTADO NO AUTENTICADO (INICIO DE SESIÓN) --- */
                    <div className="text-center pt-2">
                        {/* Logo o Icono de cabecera */}
                        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                            <i className="fa-solid fa-user-shield text-2xl"></i>
                        </div>

                        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                            Bienvenido a <span className="text-emerald-600">Ruta Clara</span>
                        </h2>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Inicia sesión para sincronizar tus reportes viales ciudadanos, acceder a rutas inteligentes seguras y personalizar tu experiencia.
                        </p>

                        {/* Botón Oficial Google Sign-In */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer border border-slate-300 shadow-sm hover:shadow active:scale-98 mb-3"
                        >
                            {isLoading ? (
                                <>
                                    <i className="fa-solid fa-circle-notch fa-spin text-emerald-600"></i>
                                    <span>Conectando con Google...</span>
                                </>
                            ) : (
                                <>
                                    {/* Icono vectorial SVG oficial de Google */}
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285F4"
                                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                                        />
                                        <path
                                            fill="#34A853"
                                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                                        />
                                        <path
                                            fill="#FBBC05"
                                            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                                        />
                                        <path
                                            fill="#EA4335"
                                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                                        />
                                    </svg>
                                    <span>Continuar con Google</span>
                                </>
                            )}
                        </button>

                        {/* Modo Demo si Firebase aún no tiene credenciales en .env */}
                        {!isFirebaseReady && (
                            <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                                <button
                                    onClick={handleDemoLogin}
                                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 underline bg-transparent border-none cursor-pointer py-1"
                                >
                                    O ingresar en Modo Demostración (Prueba Local)
                                </button>
                                <p className="text-3xs text-slate-400 mt-1 m-0">
                                    💡 Puedes configurar tus claves reales de Firebase en <code>.env</code> usando la plantilla <code>.env.example</code>.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
