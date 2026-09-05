import { supabase } from '../../core/supabase.js';

/**
 * Renderiza la sección de Integrantes dentro del contenedor principal
 */
export async function initIntegrantesModule(container) {
  // 1. Estructura visual base de la sección
  container.innerHTML = `
    <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6 max-w-lg mx-auto">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-base font-black text-gray-900 tracking-tight">Directorio de Integrantes</h2>
          <p class="text-xs text-gray-400 mt-0.5">Agrega y administra las personas del bloque.</p>
        </div>
      </div>

      <!-- Formulario para agregar integrante -->
      <form id="form-add-integrante" class="flex gap-2">
        <input 
          type="text" 
          id="input-nombre" 
          placeholder="Nombre completo..." 
          required
          class="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-green"
        />
        <button 
          type="submit" 
          class="bg-brand-green hover:bg-brand-green/90 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-transform active:scale-95 shadow-sm">
          Agregar
        </button>
      </form>

      <!-- Lista de integrantes -->
      <div id="lista-integrantes" class="space-y-2 max-h-64 overflow-y-auto pr-1">
        <p class="text-xs text-gray-400 italic text-center py-4">Cargando integrantes...</p>
      </div>
    </div>
  `;

  // 2. Referencias a los elementos del DOM creados
  const form = container.querySelector('#form-add-integrante');
  const inputNombre = container.querySelector('#input-nombre');
  const listaContainer = container.querySelector('#lista-integrantes');

  // 3. Función para obtener y pintar los integrantes desde Supabase
  async function cargarIntegrantes() {
    const { data, error } = await supabase
      .from('integrantes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      console.error("Error al cargar integrantes:", error);
      listaContainer.innerHTML = `<p class="text-xs text-brand-red text-center py-2">Error al cargar datos.</p>`;
      return;
    }

    if (data.length === 0) {
      listaContainer.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-4">No hay integrantes registrados todavía.</p>`;
      return;
    }

    // Mapeamos los datos limpios a elementos HTML
    listaContainer.innerHTML = data.map(persona => `
      <div class="flex justify-between items-center p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <span class="text-sm font-medium text-gray-800">${persona.nombre}</span>
        <button data-id="${persona.id}" class="btn-eliminar text-gray-300 hover:text-brand-red p-1.5 transition-colors">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    `).join('');

    // Adjuntar eventos de eliminación a los botones recién creados
    listaContainer.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.dataset.id;
        if (confirm("¿Estás seguro de eliminar a esta persona?")) {
          await eliminarIntegrante(id);
        }
      });
    });
  }

  // 4. Función para insertar un nuevo integrante
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = inputNombre.value.trim();
    if (!nombre) return;

    const { error } = await supabase
      .from('integrantes')
      .insert([{ nombre }]);

    if (error) {
      alert("Error al guardar en la base de datos.");
      console.error(error);
      return;
    }

    inputNombre.value = '';
    await cargarIntegrantes();
  });

  // 5. Función para eliminar un integrante
  async function eliminarIntegrante(id) {
    const { error } = await supabase
      .from('integrantes')
      .delete()
      .eq('id', id);

    if (error) {
      alert("No se pudo eliminar el registro.");
      console.error(error);
      return;
    }

    await cargarIntegrantes();
  }

  // Ejecutamos la carga inicial al montar el módulo
  await cargarIntegrantes();
}