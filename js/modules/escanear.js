import { state } from '../core/state.js';
import { supabaseClient, syncUsuario, showLoader, hideLoader, marcarDiaEvaluadoCloud } from '../core/storage.js';
import { getToday } from '../core/date.js';
import { renderUI } from '../core/render.js';

// Importaciones del nuevo módulo de reordenamiento
import { isModoOrden, configurarLongPress } from './orden_integrantes.js';

let uiState = { asistentes: [], permisos: [], ausentes: [] };
let usuarioSeleccionadoId = null;

function iniciarRevision() {
    const hoy = getToday();
    
    const asisDB = state.dbAttendance[hoy] || [];
    const permDB = state.dbPermisos[hoy] || [];
    
    if (asisDB.length > 0 || permDB.length > 0) {
        uiState.asistentes = [...asisDB];
        uiState.permisos = [...permDB];
        uiState.ausentes = state.dbUsers.filter(u => !asisDB.includes(u.id) && !permDB.includes(u.id)).map(u => u.id);
    } else {
        uiState.asistentes = state.dbUsers.map(u => u.id);
        uiState.permisos = [];
        uiState.ausentes = [];
    }

    document.getElementById('pantalla-inicio').classList.add('hidden');
    document.getElementById('pantalla-cuadricula').classList.remove('hidden');
    
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('grid-asistentes');
    grid.innerHTML = '';

    // Ahora iteramos sobre state.dbUsers que YA viene ordenado desde storage.js
    state.dbUsers.forEach(u => {
        let status = 'asistio';
        if (uiState.permisos.includes(u.id)) status = 'permiso';
        if (uiState.ausentes.includes(u.id)) status = 'falta';

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
        // AÑADIMOS OBLIGATORIAMENTE la clase 'user-card' para los estilos de Drag & Drop
        btn.className = `user-card flex flex-col items-center justify-center p-2 rounded-xl border-2 ${borderClass} ${bgClass} ${textClass} aspect-square transition-transform active:scale-95 relative`;
        
        // Atributo necesario para identificar al usuario al organizar
        btn.dataset.userId = u.id; 

        btn.onclick = () => {
            // BLOQUEO ESTRATÉGICO: Si está en modo edición, no abre el modal
            if (isModoOrden()) return; 
            abrirModal(u.id);
        };
        
        const nombreCorto = u.nombre.split(' ')[0];

        btn.innerHTML = `
            <div class="absolute top-1 right-1 opacity-70 pointer-events-none">${icon}</div>
            <span class="font-bold text-xs truncate w-full text-center mt-1 pointer-events-none">${nombreCorto}</span>
        `;

        // Activamos los sensores del long-press de 4 segundos a la tarjeta
        configurarLongPress(btn, u.id);

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
    
    uiState.asistentes = uiState.asistentes.filter(id => id !== usuarioSeleccionadoId);
    uiState.permisos = uiState.permisos.filter(id => id !== usuarioSeleccionadoId);
    uiState.ausentes = uiState.ausentes.filter(id => id !== usuarioSeleccionadoId);

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
        await supabaseClient.from('asistencias').delete().eq('fecha', hoy);
        await supabaseClient.from('permisos').delete().eq('fecha', hoy);

        const asistenciasInsert = uiState.asistentes.map(id => ({ fecha: hoy, usuario_id: id }));
        const permisosInsert = uiState.permisos.map(id => ({ fecha: hoy, usuario_id: id }));

        if (asistenciasInsert.length > 0) await supabaseClient.from('asistencias').insert(asistenciasInsert);
        if (permisosInsert.length > 0) await supabaseClient.from('permisos').insert(permisosInsert);

        await marcarDiaEvaluadoCloud(hoy);

        state.dbAttendance[hoy] = [...uiState.asistentes];
        state.dbPermisos[hoy] = [...uiState.permisos];
        if (!state.dbEvaluatedDays.includes(hoy)) state.dbEvaluatedDays.push(hoy);

        for (const u of state.dbUsers) {
            u.historialFaltas = (u.historialFaltas || []).filter(f => {
                const fFecha = typeof f === 'object' ? f.fecha : f;
                return fFecha !== hoy;
            });

            if (uiState.ausentes.includes(u.id)) {
                u.historialFaltas.push({ fecha: hoy, tipo: 'sin_permiso' });
            } else if (uiState.permisos.includes(u.id)) {
                u.historialFaltas.push({ fecha: hoy, tipo: 'con_permiso' });
            }

            await syncUsuario(u); 
        }

        alert('¡Asistencia guardada y cálculos actualizados exitosamente!');
        renderUI();
        
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
    document.getElementById('btn-iniciar-revision').onclick = iniciarRevision;
    document.getElementById('btn-guardar-asistencia').onclick = guardarEnNube;
    
    document.getElementById('btn-modal-falta').onclick = () => cambiarEstado('falta');
    document.getElementById('btn-modal-permiso').onclick = () => cambiarEstado('permiso');
    document.getElementById('btn-modal-asistio').onclick = () => cambiarEstado('asistio');
    document.getElementById('btn-modal-cerrar').onclick = cerrarModal;
}