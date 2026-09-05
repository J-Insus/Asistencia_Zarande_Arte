import { supabase } from '../../core/supabase.js';

export async function initAsistenciaModule(container) {
  const hoy = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-5 max-w-lg mx-auto pb-24">
      
      <!-- Cabecera y Fecha -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-100 pb-4">
        <div>
          <h2 class="text-base font-black text-gray-900 tracking-tight">Control de Asistencia</h2>
          <p class="text-xs text-gray-400 mt-0.5">Gestión de presencia para ensayos.</p>
        </div>
        <div class="w-full sm:w-auto">
          <input 
            type="date" 
            id="input-fecha" 
            value="${hoy}"
            class="w-full sm:w-auto bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:border-brand-green"
          />
        </div>
      </div>

      <!-- Barra de Acción: Activar Modo Edición -->
      <div id="panel-activacion" class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
        <span id="estado-modo" class="text-xs font-semibold text-gray-500">
          <i class="fa-solid fa-lock text-gray-400 mr-1.5"></i>Modo visualización
        </span>
        <button 
          id="btn-iniciar-edicion" 
          class="bg-brand-green hover:bg-brand-green/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm active:scale-95 transition-transform flex items-center gap-2">
          <i class="fa-solid fa-pen-to-square"></i>
          <span>Pasar Asistencia</span>
        </button>
      </div>

      <!-- Lista de Integrantes Adaptada a Pantallas Táctiles -->
      <div id="lista-pase-lista" class="space-y-3">
        <p class="text-xs text-gray-400 italic text-center py-6">Cargando datos...</p>
      </div>
    </div>

    <!-- Barra de Guardado Flotante para Móviles -->
    <div id="barra-guardar" class="hidden fixed bottom-4 left-4 right-4 max-w-lg mx-auto z-40 animate-fade-in">
      <div class="bg-gray-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 border border-gray-800">
        <span class="text-xs text-gray-300 font-medium pl-2">
          <i class="fa-solid fa-circle-info text-brand-yellow mr-1.5"></i>Cambios sin guardar
        </span>
        <div class="flex gap-2">
          <button id="btn-cancelar-edicion" class="px-3 py-2 text-xs font-bold text-gray-300 hover:text-white rounded-xl bg-gray-800">
            Cancelar
          </button>
          <button id="btn-guardar-asistencia" class="px-4 py-2 text-xs font-bold text-white bg-brand-green hover:bg-brand-green/90 rounded-xl shadow-sm active:scale-95 transition-transform">
            Guardar
          </button>
        </div>
      </div>
    </div>
  `;

  const inputFecha = container.querySelector('#input-fecha');
  const listaPaseContainer = container.querySelector('#lista-pase-lista');
  const panelActivacion = container.querySelector('#panel-activacion');
  const estadoModo = container.querySelector('#estado-modo');
  const btnIniciarEdicion = container.querySelector('#btn-iniciar-edicion');
  const barraGuardar = container.querySelector('#barra-guardar');
  const btnGuardar = container.querySelector('#btn-guardar-asistencia');
  const btnCancelar = container.querySelector('#btn-cancelar-edicion');

  let integrantes = [];
  let asistenciasOriginales = {}; // Datos reales de la base de datos
  let asistenciasBorrador = {};   // Copia local para modificar durante la edición
  let modoEdicionActivo = false;

  async function cargarDatos(fecha) {
    modoEdicionActivo = false;
    actualizarVistaModo();
    listaPaseContainer.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-6">Cargando...</p>`;

    // 1. Obtener integrantes ordenados
    const { data: resIntegrantes, error: errInt } = await supabase
      .from('integrantes')
      .select('*')
      .order('nombre', { ascending: true });

    if (errInt) {
      listaPaseContainer.innerHTML = `<p class="text-xs text-brand-red text-center py-4">Error al cargar integrantes.</p>`;
      return;
    }

    integrantes = resIntegrantes || [];

    if (integrantes.length === 0) {
      listaPaseContainer.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-6">No hay integrantes registrados.</p>`;
      return;
    }

    // 2. Obtener asistencias de la fecha
    const { data: resAsistencias } = await supabase
      .from('asistencias')
      .select('integrante_id, estado')
      .eq('fecha', fecha);

    asistenciasOriginales = {};
    (resAsistencias || []).forEach(item => {
      asistenciasOriginales[item.integrante_id] = item.estado;
    });

    // Clonamos las asistencias al borrador de trabajo
    asistenciasBorrador = { ...asistenciasOriginales };
    renderizarLista();
  }

  function renderizarLista() {
    listaPaseContainer.innerHTML = integrantes.map(persona => {
      const estadoSeleccionado = asistenciasBorrador[persona.id] || '';

      return `
<div class="p-3.5 bg-gray-100 border border-gray-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">          <span class="text-sm font-bold text-gray-800 tracking-tight">${persona.nombre}</span>

          <!-- Controles Touch amigables para móviles -->
          <div class="grid grid-cols-3 gap-1.5 w-full sm:w-auto" data-integrante-id="${persona.id}">
            
            <button 
              data-estado="asistio"
              ${!modoEdicionActivo ? 'disabled' : ''}
              class="btn-estado py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                estadoSeleccionado === 'asistio'
                  ? 'bg-brand-green text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 ' + (modoEdicionActivo ? 'hover:bg-gray-100 active:scale-95' : 'opacity-60 cursor-not-allowed')
              }">
              <i class="fa-solid fa-check text-[10px]"></i>
              Asistió
            </button>

            <button 
              data-estado="falta"
              ${!modoEdicionActivo ? 'disabled' : ''}
              class="btn-estado py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                estadoSeleccionado === 'falta'
                  ? 'bg-brand-red text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 ' + (modoEdicionActivo ? 'hover:bg-gray-100 active:scale-95' : 'opacity-60 cursor-not-allowed')
              }">
              <i class="fa-solid fa-xmark text-[10px]"></i>
              Falta
            </button>

            <button 
              data-estado="permiso"
              ${!modoEdicionActivo ? 'disabled' : ''}
              class="btn-estado py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                estadoSeleccionado === 'permiso'
                  ? 'bg-brand-orange text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 ' + (modoEdicionActivo ? 'hover:bg-gray-100 active:scale-95' : 'opacity-60 cursor-not-allowed')
              }">
              <i class="fa-solid fa-hand text-[10px]"></i>
              Permiso
            </button>
            
          </div>
        </div>
      `;
    }).join('');

    if (!modoEdicionActivo) return;

    // Asignar eventos de clic en los botones (solo cambian memoria local)
    listaPaseContainer.querySelectorAll('[data-integrante-id]').forEach(grupo => {
      const integranteId = grupo.dataset.integranteId;
      grupo.querySelectorAll('.btn-estado').forEach(btn => {
        btn.addEventListener('click', () => {
          const nuevoEstado = btn.dataset.estado;
          // Si hace clic en el mismo estado activo, se puede deseleccionar
          asistenciasBorrador[integranteId] = asistenciasBorrador[integranteId] === nuevoEstado ? '' : nuevoEstado;
          renderizarLista();
        });
      });
    });
  }

  function actualizarVistaModo() {
    if (modoEdicionActivo) {
      panelActivacion.classList.add('bg-brand-green/10', 'border-brand-green/30');
      panelActivacion.classList.remove('bg-gray-50', 'border-gray-100');
      estadoModo.innerHTML = `<i class="fa-solid fa-unlock text-brand-green mr-1.5"></i><span class="text-brand-green">Editando asistencia...</span>`;
      btnIniciarEdicion.classList.add('hidden');
      barraGuardar.classList.remove('hidden');
    } else {
      panelActivacion.classList.remove('bg-brand-green/10', 'border-brand-green/30');
      panelActivacion.classList.add('bg-gray-50', 'border-gray-100');
      estadoModo.innerHTML = `<i class="fa-solid fa-lock text-gray-400 mr-1.5"></i>Modo visualización`;
      btnIniciarEdicion.classList.remove('hidden');
      barraGuardar.classList.add('hidden');
    }
  }

  // Activar modo edición
  btnIniciarEdicion.addEventListener('click', () => {
    modoEdicionActivo = true;
    actualizarVistaModo();
    renderizarLista();
  });

  // Cancelar cambios sin guardar
  btnCancelar.addEventListener('click', () => {
    asistenciasBorrador = { ...asistenciasOriginales };
    modoEdicionActivo = false;
    actualizarVistaModo();
    renderizarLista();
  });

  // Guardar en bloque en Supabase
  btnGuardar.addEventListener('click', async () => {
    btnGuardar.disabled = true;
    btnGuardar.innerText = "Guardando...";

    const fecha = inputFecha.value;

    // Construimos las operaciones de inserción/actualización
    const operaciones = Object.entries(asistenciasBorrador)
      .filter(([_, estado]) => estado !== '') // Ignoramos sin marcar
      .map(([integranteId, estado]) => ({
        fecha,
        integrante_id: integranteId,
        estado
      }));

    if (operaciones.length > 0) {
      // Usamos upsert de Supabase para insertar o actualizar en bloque basándonos en fecha e integrante_id
      const { error } = await supabase
        .from('asistencias')
        .upsert(operaciones, { onConflict: 'fecha,integrante_id' });

      if (error) {
        // En caso de que no haya un constraint compuesto, usamos la persistencia segura manual
        for (const op of operaciones) {
          const { data: existente } = await supabase
            .from('asistencias')
            .select('id')
            .eq('fecha', op.fecha)
            .eq('integrante_id', op.integrante_id);

          if (existente && existente.length > 0) {
            await supabase.from('asistencias').update({ estado: op.estado }).eq('id', existente[0].id);
          } else {
            await supabase.from('asistencias').insert([op]);
          }
        }
      }
    }

    btnGuardar.disabled = false;
    btnGuardar.innerText = "Guardar";
    
    // Recargar datos oficiales desde la base de datos
    await cargarDatos(fecha);
  });

  inputFecha.addEventListener('change', (e) => {
    cargarDatos(e.target.value);
  });

  await cargarDatos(inputFecha.value);
}