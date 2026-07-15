import { state } from './state.js';
import { getToday } from './date.js';
import { calcularDatosHistoricos } from './storage.js'; // <--- Importamos el motor de cálculo

export function renderConfirmedList() {
    const hoy = getToday();
    const listConfirmados = document.getElementById('confirmed-list');
    const asistidosHoy = state.dbAttendance[hoy] || [];

    if (asistidosHoy.length === 0) {
        listConfirmados.innerHTML = `<p class="text-xs text-gray-400 italic text-center py-2">Nadie validado en la fecha actual.</p>`;
    } else {
        listConfirmados.innerHTML = asistidosHoy.map(id => {
            const u = state.dbUsers.find(x => x.id === id);
            return `<li class="py-2.5 flex justify-between items-center border-b border-gray-50">
                <span class="font-medium text-gray-700">${u ? u.nombre : 'Desconocido'}</span>
                <span class="text-[10px] font-bold text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">✓ Validado</span>
            </li>`;
        }).join('');
    }
}

export function renderReportsTable() {
    const tableBody = document.getElementById('reports-table-body');
    // Validación de seguridad: si no existe en el DOM, no hacer nada
    if (!tableBody) return; 
  
    tableBody.innerHTML = state.dbUsers.map(u => {
      const totales = calcularDatosHistoricos(u, state.dbAttendance);
      return `
      <tr class="border-b border-gray-100 hover:bg-gray-50/50">
        <td class="py-2.5 px-2 font-medium text-gray-800">${u.nombre}</td>
        <td class="py-2.5 px-2 text-center text-gray-500 font-bold">${totales.faltas}</td>
        <td class="py-2.5 px-2 text-right font-mono font-bold ${totales.deuda > 0 ? 'text-brand-red' : 'text-brand-green'}">
          $${totales.deuda.toLocaleString('es-CO')}
        </td>
      </tr>
      `;
    }).join('');
  }
export function renderManageList() {
    const manageList = document.getElementById('manage-users-list');
    manageList.innerHTML = state.dbUsers.map(u => {
        // Calculamos los totales reales en tiempo real con el motor
        const totales = calcularDatosHistoricos(u, state.dbAttendance);

        return `
        <div class="flex justify-between items-center p-3 bg-white border border-gray-200/60 rounded-xl shadow-sm">
            <div class="flex-1 min-w-0 pr-2">
                <p class="font-bold text-sm text-gray-900 truncate">${u.nombre}</p>
                <p class="text-[10px] text-gray-400 font-mono truncate">ID QR: ${u.id}</p>
            </div>
            <div class="flex items-center gap-2">
                <!-- El botón Condonar ahora evalúa "totales.deuda" en tiempo real -->
                ${totales.deuda > 0 ? `
                    <button data-action="condonar" data-user-id="${u.id}" class="bg-brand-yellow text-white text-[11px] font-bold px-3 py-1.5 rounded-lg active:scale-95 shadow-xs">
                        Condonar
                    </button>
                ` : ''}
                <button data-action="eliminar" data-user-id="${u.id}" class="text-gray-300 hover:text-brand-red p-1.5 transition-colors">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
}

export function renderSelectors() {
    document.getElementById('sim-select').innerHTML = state.dbUsers.map(u =>
        `<option value="${u.id}">${u.nombre}</option>`
    ).join('');

    const auditSelect = document.getElementById('user-audit-select');
    const selectedAuditUser = auditSelect.value;
    auditSelect.innerHTML = `<option value="">-- Seleccionar Asistente --</option>` +
        state.dbUsers.map(u => `<option value="${u.id}">${u.nombre}</option>`).join('');
    auditSelect.value = selectedAuditUser;
}

export function renderUI() {
    renderSelectors();
    renderConfirmedList();
    renderManageList();
    renderReportsTable(); // Nos aseguramos de mantener actualizada también la tabla de reportes
    document.dispatchEvent(new Event('renderUI'));
}