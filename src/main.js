import './styles/style.css';
import { initHomeModule } from './features/home/home.js';
import { initIntegrantesModule } from './features/integrantes/integrantes.js';
import { initAsistenciaModule } from './features/asistencia/asistencia.js';

const app = document.querySelector('#app');

function renderizarAppPrincipal() {
  app.innerHTML = `
    <div class="min-h-screen bg-brand-light p-4">
      <main class="max-w-lg mx-auto space-y-6 pb-12">
        <header class="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 class="text-base font-black text-gray-900 tracking-tight">ZarandeArte</h1>
            <p class="text-xs text-gray-400">Bloque de Ada y Yesid</p>
          </div>
          <button id="btn-cerrar-sesion" class="text-xs font-bold text-gray-400 hover:text-brand-red transition-colors">
            <i class="fa-solid fa-arrow-right-from-bracket mr-1">Salir</i>
          </button>
        </header>

        <!-- Navegación interna de pestañas -->
        <nav class="flex gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <button data-tab="asistencia" class="tab-btn flex-1 py-2 text-xs font-bold rounded-xl bg-brand-green text-white shadow-sm transition-all">
            Asistencia
          </button>
          <button data-tab="integrantes" class="tab-btn flex-1 py-2 text-xs font-bold rounded-xl text-gray-500 hover:bg-gray-50 transition-all">
            Integrantes
          </button>
        </nav>

        <!-- Contenedor dinámico de los módulos -->
        <div id="dynamic-module-container"></div>
      </main>
    </div>
  `;

  const containerModulo = app.querySelector('#dynamic-module-container');
  const btnCerrarSesion = app.querySelector('#btn-cerrar-sesion');
  const tabButtons = app.querySelectorAll('.tab-btn');

  // Por defecto cargamos el módulo de asistencia
  initAsistenciaModule(containerModulo);

  // Manejador de pestañas
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Cambiar estilos activos de las pestañas
      tabButtons.forEach(b => {
        b.classList.remove('bg-brand-green', 'text-white', 'shadow-sm');
        b.classList.add('text-gray-500', 'hover:bg-gray-50');
      });
      btn.classList.add('bg-brand-green', 'text-white', 'shadow-sm');
      btn.classList.remove('text-gray-500', 'hover:bg-gray-50');

      // Cargar módulo correspondiente
      const tabName = btn.dataset.tab;
      if (tabName === 'asistencia') {
        initAsistenciaModule(containerModulo);
      } else if (tabName === 'integrantes') {
        initIntegrantesModule(containerModulo);
      }
    });
  });

  // Botón para salir y regresar al Home
  btnCerrarSesion.addEventListener('click', () => {
    renderizarHome();
  });
}

function renderizarHome() {
  initHomeModule(app, () => {
    // Callback que se ejecuta cuando el PIN es correcto ('2026')
    renderizarAppPrincipal();
  });
}

// Inicializar la aplicación mostrando el Home
document.addEventListener('DOMContentLoaded', () => {
  renderizarHome();
});