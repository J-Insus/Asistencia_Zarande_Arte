import { state } from '../core/state.js';
import { getToday } from '../core/date.js';
import { calcularDatosHistoricos } from '../core/storage.js';

// Función auxiliar para extraer la fecha de forma segura (soporta objetos y strings viejos)
const obtenerFechaFalta = (f) => {
    if (!f) return '';
    return typeof f === 'object' ? f.fecha : f;
};

function renderFaltas() {
    const filtro = document.getElementById('filtro-faltas').value;
    const fechaFiltro = document.getElementById('filtro-fecha').value;
    const tHead = document.getElementById('faltas-thead');
    const tBody = document.getElementById('faltas-tbody');
    const calContainer = document.getElementById('calendario-container');

    tBody.innerHTML = '';
    calContainer.classList.add('hidden');

    if (filtro === 'general') {
        tHead.innerHTML = `
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <th class="py-2 px-3">Nombre del Asistente</th>
                <th class="py-2 px-3 text-right">Estado de Falta</th>
            </tr>`;
        
        const hoy = getToday();

        // Filtrar usando la función auxiliar segura
        const ausentesHoy = state.dbUsers.filter(u => 
            u.historialFaltas && u.historialFaltas.some(f => obtenerFechaFalta(f) === hoy)
        );

        if (ausentesHoy.length === 0) {
            tBody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-xs text-gray-400">Nadie tiene faltas registradas el día de hoy.</td></tr>`;
            return;
        }

        tBody.innerHTML = ausentesHoy.map(u => {
            const registro = u.historialFaltas.find(f => obtenerFechaFalta(f) === hoy);
            const esPermiso = registro && registro.tipo === 'con_permiso';
            return `
            <tr class="hover:bg-gray-50/50">
                <td class="py-2.5 px-3 font-medium text-gray-800">${u.nombre}</td>
                <td class="py-2.5 px-3 text-right">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${esPermiso ? 'bg-brand-yellow/10 text-brand-yellow' : 'bg-brand-red/10 text-brand-red'}">
                        ${esPermiso ? 'Con Permiso' : 'Sin Permiso'}
                    </span>
                </td>
            </tr>`;
        }).join('');

    } else if (filtro === 'calendario') {
        calContainer.classList.remove('hidden');
        tHead.innerHTML = `
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <th class="py-2 px-3">Asistentes que Faltaron</th>
                <th class="py-2 px-3 text-right">Condición</th>
            </tr>`;
        
        if (!fechaFiltro) {
            tBody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-xs text-gray-400">Selecciona una fecha.</td></tr>`;
            return;
        }

        // Filtrar usando la función auxiliar segura
        const ausentes = state.dbUsers.filter(u => 
            u.historialFaltas && u.historialFaltas.some(f => obtenerFechaFalta(f) === fechaFiltro)
        );
        
        if (ausentes.length === 0) {
            tBody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-xs text-gray-400">No hay faltas registradas en esta fecha.</td></tr>`;
            return;
        }

        tBody.innerHTML = ausentes.map(u => {
            const registro = u.historialFaltas.find(f => obtenerFechaFalta(f) === fechaFiltro);
            const esPermiso = registro && registro.tipo === 'con_permiso';
            return `
            <tr class="hover:bg-gray-50/50">
                <td class="py-2.5 px-3 font-medium text-gray-800">${u.nombre}</td>
                <td class="py-2.5 px-3 text-right text-[10px] font-bold ${esPermiso ? 'text-brand-yellow' : 'text-brand-red'}">
                    ${esPermiso ? 'Con Permiso' : 'Sin Permiso'}
                </td>
            </tr>`;
        }).join('');

    } else if (filtro === 'totales') {
        tHead.innerHTML = `
            <tr class="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px]">
                <th class="py-2 px-3">Nombre</th>
                <th class="py-2 px-3 text-center">Total Faltas</th>
            </tr>`;
        
        // Mapeamos los usuarios recalculando sus faltas al vuelo para evitar datos desactualizados en la vista
        const usuariosCalculados = state.dbUsers.map(u => {
            const totales = calcularDatosHistoricos(u, state.dbAttendance);
            return {
                nombre: u.nombre,
                faltas: totales.faltas
            };
        });

        const usuariosConFaltas = usuariosCalculados
            .filter(u => u.faltas > 0)
            .sort((a, b) => b.faltas - a.faltas);

        if (usuariosConFaltas.length === 0) {
            tBody.innerHTML = `<tr><td colspan="2" class="py-4 text-center text-xs text-gray-400">Nadie tiene faltas acumuladas.</td></tr>`;
            return;
        }

        tBody.innerHTML = usuariosConFaltas.map(u => `
            <tr class="hover:bg-gray-50/50">
                <td class="py-2.5 px-3 font-medium text-gray-800">${u.nombre}</td>
                <td class="py-2.5 px-3 text-center font-bold text-gray-500">${u.faltas}</td>
            </tr>`).join('');
    }
}

export function initReportsModule() {
    const filtroSelect = document.getElementById('filtro-faltas');
    const filtroFecha = document.getElementById('filtro-fecha');
    
    filtroFecha.value = getToday();
    
    filtroSelect.addEventListener('change', renderFaltas);
    filtroFecha.addEventListener('change', renderFaltas);
    
    // Render inicial
    document.addEventListener('renderUI', renderFaltas); 
}