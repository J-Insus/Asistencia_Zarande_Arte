export function initHomeModule(container, onLoginSuccess) {
  container.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-light animate-fade-in">
      <div class="max-w-md w-full text-center space-y-8">
        
        <!-- Título Principal -->
        <div class="space-y-2">
          <h1 class="text-4xl font-black text-gray-900 tracking-tight">ZarandeArte</h1>
          <p class="text-xs text-gray-500 uppercase tracking-widest font-semibold">Sistema de Control y Gestión</p>
        </div>

        <!-- Tarjeta del Bloque (Minimalista y elegante) -->
        <div id="card-bloque" class="group bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-brand-green hover:shadow-md transition-all cursor-pointer text-left space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-xs font-bold px-2.5 py-1 bg-brand-light text-gray-600 rounded-lg">Acceso Protegido</span>
            <i class="fa-solid fa-lock text-gray-300 group-hover:text-brand-green transition-colors"></i>
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-800 group-hover:text-brand-green transition-colors">Bloque de Ada y Yesid</h2>
            <p class="text-xs text-gray-400 mt-0.5">Haz clic para ingresar el código de acceso del bloque.</p>
          </div>

          <!-- Contenedor oculto para pedir el PIN -->
          <div id="pin-container" class="hidden pt-4 border-t border-gray-100 space-y-3">
            <p class="text-xs font-semibold text-gray-600">Ingresa el código de acceso:</p>
            <div class="flex gap-2">
              <input 
                type="password" 
                id="input-pin" 
                placeholder="Código..." 
                maxlength="4"
                class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center tracking-widest focus:outline-none focus:border-brand-green"
              />
              <button 
                id="btn-verificar-pin" 
                class="bg-brand-green hover:bg-brand-green/90 text-white text-xs font-bold px-4 py-2 rounded-xl transition-transform active:scale-95 shadow-sm">
                Entrar
              </button>
            </div>
            <p id="error-pin" class="text-xs text-brand-red hidden">Código incorrecto. Intenta de nuevo.</p>
          </div>
        </div>

      </div>
    </div>
  `;

  const cardBloque = container.querySelector('#card-bloque');
  const pinContainer = container.querySelector('#pin-container');
  const inputPin = container.querySelector('#input-pin');
  const btnVerificar = container.querySelector('#btn-verificar-pin');
  const errorPin = container.querySelector('#error-pin');

  // Al hacer clic en la tarjeta, mostramos el campo para el PIN
  cardBloque.addEventListener('click', (e) => {
    // Evitamos que se colapse si hacen clic dentro del input o botón
    if (e.target.closest('#pin-container')) return;
    
    pinContainer.classList.remove('hidden');
    inputPin.focus();
  });

  // Lógica de validación del PIN
  const verificarAcceso = () => {
    const pinIngresado = inputPin.value.trim();
    if (pinIngresado === '2026') {
      // Si es correcto, ejecutamos la función que pasa a la app principal
      onLoginSuccess();
    } else {
      errorPin.classList.remove('hidden');
      inputPin.value = '';
      inputPin.focus();
    }
  };

  btnVerificar.addEventListener('click', (e) => {
    e.stopPropagation();
    verificarAcceso();
  });

  inputPin.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verificarAcceso();
    }
  });
}