import { state } from '../core/state.js';
import { supabaseClient, syncUsuario, showLoader, hideLoader, marcarDiaEvaluadoCloud } from '../core/storage.js';
import { getToday } from '../core/date.js';
import { renderUI } from '../core/render.js';

// Arreglos temporales para manejar el estado visual antes de guardar
let uiState = {
    asistentes: [],
    permisos: [],
    ausentes: []
};
let usuarioSeleccionadoId = null;

function iniciarRevision() {
    const hoy = getToday();
    
    // 1. Cargar lo que ya existe en la Base de Datos para el día de hoy
    const asisDB = state.dbAttendance[hoy] || [];
    const permDB = state.dbPermisos[hoy] || [];
    
    // Si ya existe registro de hoy, lo cargamos
    if (asisDB.length > 0 || permDB.length > 0) {
        uiState.asistentes = [...asisDB];
        uiState.permisos = [...permDB];
        // Los ausentes son los que no están en ninguno de los dos
        uiState.ausentes = state.dbUsers
            .filter(u => !asisDB.includes(u.id) && !permDB.includes(u.id))
            .map(u => u.id);
    } else {
        // Si no hay datos, asumimos por defecto que TODOS asisten
        uiState.asistentes = state.dbUsers.map(u => u.id);
        uiState.permisos = [];
        uiState.ausentes = [];
    }

    // Cambiar a la vista de cuadrícula
    document.getElementById('pantalla-inicio').classList.add('hidden');
    document.getElementById('pantalla-cuadricula').classList.remove('hidden');
    
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('grid-asistentes');
    grid.innerHTML = '';

    state.dbUsers.forEach(u => {
        let status = 'asistio';
        if (uiState.permisos.includes(u.id)) status = 'permiso';
        if (uiState.ausentes.includes(u.id)) status = 'falta';

        // Estilos según estado
        let bgClass = 'bg-brand-green/10';
        let borderClass = 'border-brand-green';
        let textClass = 'text-brand-green';
        let icon = '<i class="fa-solid fa-check text-[10px]"></i>';

        if (status === 'falta') {
            bgClass = 'bg-brand-red/10';
            borderClass = 'border-brand-red';
            textClass = 'text-brand-red';
            icon = '<i class="fa-solid fa-xmark text-[10px]"></i>';
        } else if (status === 'permiso') {
            bgClass = 'bg-brand-yellow/10';
            borderClass = 'border-brand-yellow';
            textClass = 'text-brand-yellow';
            icon = '<i class="fa-solid fa-hand-holding-medical text-[10px]"></i>';
        }

        const btn = document.createElement('button');
        btn.className = `flex flex-col items-center justify-center p-2 rounded-xl border-2 ${borderClass} ${bgClass} ${textClass} aspect-square transition-transform active:scale-95 relative`;
        btn.onclick = () => abrirModal(u.id);
        
        // Extraer el primer nombre para que quepa bien en el cuadrito pequeño
        const nombreCorto = u.nombre.split(' ')[0];

        btn.innerHTML = `
            <div class="absolute top-1 right-1 opacity-70">${icon}</div>
            <span class="font-bold text-xs truncate w-full text-center mt-1">${nombreCorto}</span>
        `;
        grid.appendChild(btn);
    });
}

function abrirModal(userId) {
    usuarioSeleccionadoId = userId;
    const user = state.dbUsers.find(u => u.id === userId);
    document.getElementById("modal-user-name").innerText = user.nombre;
    document.getElementById("scan-modal").classList.remove('hidden');
}

function cerrarModal() {
    usuarioSeleccionadoId = null;
    document.getElementById("scan-modal").classList.add('hidden');
}

function cambiarEstado(nuevoEstado) {
    if (!usuarioSeleccionadoId) return;
    
    // Remover de todas las listas temporales
    uiState.asistentes = uiState.asistentes.filter(id => id !== usuarioSeleccionadoId);
    uiState.permisos = uiState.permisos.filter(id => id !== usuarioSeleccionadoId);
    uiState.ausentes = uiState.ausentes.filter(id => id !== usuarioSeleccionadoId);

    // Agregar a la lista que se eligió
    if (nuevoEstado === 'falta') uiState.ausentes.push(usuarioSeleccionadoId);
    if (nuevoEstado === 'permiso') uiState.permisos.push(usuarioSeleccionadoId);
    if (nuevoEstado === 'asistio') uiState.asistentes.push(usuarioSeleccionadoId);

    cerrarModal();
    renderGrid();
}

async function guardarEnNube() {
    const hoy = getToday();
    showLoader();
    
    try {
        // 1. Limpiar registros de hoy en Supabase para evitar duplicados si se están editando
        await supabaseClient.from('asistencias').delete().eq('fecha', hoy);
        await supabaseClient.from('permisos').delete().eq('fecha', hoy);

        // 2. Preparar los nuevos datos a insertar
        const asistenciasInsert = uiState.asistentes.map(id => ({ fecha: hoy, usuario_id: id }));
        const permisosInsert = uiState.permisos.map(id => ({ fecha: hoy, usuario_id: id }));

        // 3. Insertar listas masivas en la nube
        if (asistenciasInsert.length > 0) await supabaseClient.from('asistencias').insert(asistenciasInsert);
        if (permisosInsert.length > 0) await supabaseClient.from('permisos').insert(permisosInsert);

        // 4. Marcar el día como evaluado
        await marcarDiaEvaluadoCloud(hoy);

        // 5. Actualizar el State Local Global
        state.dbAttendance[hoy] = [...uiState.asistentes];
        state.dbPermisos[hoy] = [...uiState.permisos];
        if (!state.dbEvaluatedDays.includes(hoy)) state.dbEvaluatedDays.push(hoy);

        // 6. Actualizar el Historial de Faltas de los Usuarios y recalcular saldos
        for (const u of state.dbUsers) {
            // Eliminar el registro del historial de hoy (por si existía y ahora el usuario sí asistió)
            u.historialFaltas = (u.historialFaltas || []).filter(f => {
                const fFecha = typeof f === 'object' ? f.fecha : f;
                return fFecha !== hoy;
            });

            // Si quedó como ausente o permiso, agregar el registro del día
            if (uiState.ausentes.includes(u.id)) {
                u.historialFaltas.push({ fecha: hoy, tipo: 'sin_permiso' });
            } else if (uiState.permisos.includes(u.id)) {
                u.historialFaltas.push({ fecha: hoy, tipo: 'con_permiso' });
            }

            // SyncUsuario llama al motor para actualizar deuda/faltas reales y guarda en la BD
            await syncUsuario(u); 
        }

        alert('¡Asistencia guardada y cálculos actualizados exitosamente!');
        renderUI(); // Refrescar las demás pestañas (Consultas, Tablas, etc.)
        
        // Volver a la pantalla principal
        document.getElementById('pantalla-cuadricula').classList.add('hidden');
        document.getElementById('pantalla-inicio').classList.remove('hidden');

    } catch (error) {
        console.error("Error guardando asistencia:", error);
        alert("Hubo un error al guardar. Revisa la conexión.");
    } finally {
        hideLoader();
    }
}

export function initScanModule() {
    // Eventos principales
    document.getElementById('btn-iniciar-revision').onclick = iniciarRevision;
    document.getElementById('btn-guardar-asistencia').onclick = guardarEnNube;
    
    // Eventos del modal
    document.getElementById('btn-modal-falta').onclick = () => cambiarEstado('falta');
    document.getElementById('btn-modal-permiso').onclick = () => cambiarEstado('permiso');
    document.getElementById('btn-modal-asistio').onclick = () => cambiarEstado('asistio');
    document.getElementById('btn-modal-cerrar').onclick = cerrarModal;
}