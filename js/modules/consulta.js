import { state } from '../core/state.js';
import { calcularDatosHistoricos } from '../core/storage.js';

export function cargarAuditoriaIndividual(userId) {
    const card = document.getElementById('audit-card');
    const datesList = document.getElementById('audit-dates-list');

    if (!userId) {
        card.classList.add('hidden');
        return;
    }

    const user = state.dbUsers.find(u => u.id === userId);

    // Calcular totales y obtener el desglose detallado
    const totalesActualizados = calcularDatosHistoricos(user, state.dbAttendance);

    // Pintar los totales arriba
    document.getElementById('audit-faltas').innerText = totalesActualizados.faltas;
    document.getElementById('audit-deuda').innerText = `$${totalesActualizados.deuda.toLocaleString('es-CO')} COP`;

    const cargos = totalesActualizados.desglose || [];

    if (cargos.length === 0) {
        datesList.innerHTML = `<p class="text-[11px] text-gray-400 italic">¡Excelente! No tienes deudas ni faltas acumuladas.</p>`;
    } else {
        // Iteramos sobre todos los cargos (incluyendo moras)
        datesList.innerHTML = cargos.map(cargo => {
            const colorMonto = cargo.esMora ? 'text-amber-600' : 'text-brand-red';
            const fondoTag = cargo.esMora ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-red-50 text-red-700 border-red-100';

            return `
            <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs animate-fade-in">
                <div class="flex flex-col gap-0.5">
                    <span class="font-medium text-gray-700">${cargo.fecha}</span>
                    <span class="text-[9px] px-1.5 py-0.5 w-fit rounded-full border ${fondoTag}">
                        ${cargo.concepto}
                    </span>
                </div>
                <span class="${colorMonto} font-bold font-mono text-right">
                    +$${cargo.valor.toLocaleString('es-CO')} COP
                </span>
            </div>`;
        }).join('');
    }
    card.classList.remove('hidden');
}

export function initConsultaModule() {
    document.getElementById('user-audit-select').addEventListener('change', (e) => {
        cargarAuditoriaIndividual(e.target.value);
    });
}