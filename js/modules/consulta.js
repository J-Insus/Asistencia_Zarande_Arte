import { state } from '../core/state.js';

export function cargarAuditoriaIndividual(userId) {
    const card = document.getElementById('audit-card');
    const datesList = document.getElementById('audit-dates-list');

    if (!userId) {
        card.classList.add('hidden');
        return;
    }

    const user = state.dbUsers.find(u => u.id === userId);
    document.getElementById('audit-faltas').innerText = user.faltas;
    document.getElementById('audit-deuda').innerText = `$${user.deuda.toLocaleString('es-CO')} COP`;

    const faltas = user.historialFaltas || [];
    if (faltas.length === 0) {
        datesList.innerHTML = `<p class="text-[11px] text-gray-400 italic">¡Excelente! No tienes deudas ni faltas acumuladas.</p>`;
    } else {
        datesList.innerHTML = faltas.map(fecha => `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs">
                <span class="font-medium text-gray-700">${fecha}</span>
                <span class="text-brand-red font-bold font-mono">+$1.000 COP</span>
            </div>
        `).join('');
    }
    card.classList.remove('hidden');
}

export function initConsultaModule() {
    document.getElementById('user-audit-select').addEventListener('change', (e) => {
        cargarAuditoriaIndividual(e.target.value);
    });
}
