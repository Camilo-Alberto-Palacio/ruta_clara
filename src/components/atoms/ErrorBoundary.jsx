import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.warn('Cache clearing error:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800 z-[99999]">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl shadow-sm mb-4 border border-emerald-200">
            <i className="fa-solid fa-bicycle"></i>
          </div>
          <h1 className="text-xl font-black text-slate-900 mb-2 text-center">
            Ruta Clara
          </h1>
          <p className="text-sm text-slate-600 text-center max-w-xs mb-6 leading-relaxed">
            Se presentó una dificultad al cargar la vista. Puedes reiniciar la aplicación para continuar pedaleando seguro.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 border-none cursor-pointer active:scale-95 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate-right"></i>
            <span>Reiniciar Aplicación</span>
          </button>
          {this.state.error && (
            <details className="mt-8 text-2xs text-slate-400 max-w-sm overflow-auto text-left bg-white p-3 rounded-xl border border-slate-200">
              <summary className="cursor-pointer font-medium text-slate-500">Detalles técnicos</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono text-[10px] text-rose-600">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
