import { state } from '../core/state.js';
import { syncUsuario, removeUser, showLoader, hideLoader, calcularDatosHistoricos } from '../core/storage.js';
import { renderUI } from '../core/render.js';
import { cargarAuditoriaIndividual } from './consulta.js';

export async function agregarUsuario() {
    const nombre = prompt("Nombre completo de la persona:");
    if (!nombre) return;

    const uniqueId = 'qr_' + Math.random().toString(36).substr(2, 6);
    const nuevoUsuario = { id: uniqueId, nombre: nombre, faltas: 0, deuda: 0, historialFaltas: [] };

    showLoader();
    state.dbUsers.push(nuevoUsuario);
    await syncUsuario(nuevoUsuario);
    hideLoader();

    renderUI();
    alert(`Registrado con éxito.\nCódigo QR Token: ${uniqueId}`);
}

export async function abonarPagoCompleto(userId) {
    const user = state.dbUsers.find(u => u.id === userId);
    if (!user) return;

    // Calculamos el saldo real en tiempo real usando el motor de cálculo
    const totalesCalculados = calcularDatosHistoricos(user, state.dbAttendance);

    // Si el cálculo en tiempo real arroja que no tiene saldo pendiente, evitamos continuar
    if (totalesCalculados.deuda === 0) {
        alert(`${user.nombre} no tiene ninguna deuda pendiente por condonar/pagar.`);
        return;
    }

    if (confirm(`¿Confirmar recepción de pago/condonación por $${totalesCalculados.deuda.toLocaleString('es-CO')} de ${user.nombre}? Se limpiará su saldo.`)) {
        showLoader();
        user.deuda = 0;
        user.faltas = 0;
        user.historialFaltas = [];
        
        await syncUsuario(user);
        hideLoader();

        renderUI();
        if (document.getElementById('user-audit-select').value === userId) {
            cargarAuditoriaIndividual(userId);
        }
    }
}

export async function removerPersona(userId) {
    if (confirm('¿Estás seguro de eliminar a esta persona del listado de control?')) {
        await removeUser(userId);
        state.dbUsers = state.dbUsers.filter(u => u.id !== userId);
        renderUI();
    }
}

export function initGestionModule() {
    document.getElementById('btn-add-user').addEventListener('click', agregarUsuario);
    document.getElementById('manage-users-list').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;

        const userId = btn.dataset.userId;
        if (btn.dataset.action === 'condonar') {
            abonarPagoCompleto(userId);
        } else if (btn.dataset.action === 'eliminar') {
            removerPersona(userId);
        }
    });
}