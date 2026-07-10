import { state } from '../core/state.js';
import { guardarDatos, removeUser } from '../core/storage.js';
import { renderUI } from '../core/render.js';
import { cargarAuditoriaIndividual } from './consulta.js';

export function agregarUsuario() {
    const nombre = prompt('Nombre completo de la persona:');
    if (nombre) {
        const uniqueId = 'qr_' + Math.random().toString(36).substr(2, 6);
        state.dbUsers.push({ id: uniqueId, nombre: nombre, faltas: 0, deuda: 0, historialFaltas: [] });
        guardarDatos();
        renderUI();
        alert(`Registrado con éxito.\nCódigo QR Token: ${uniqueId}`);
    }
}

export function abonarPagoCompleto(userId) {
    const user = state.dbUsers.find(u => u.id === userId);
    if (user && user.deuda > 0) {
        if (confirm(`¿Confirmar recepción de pago por $${user.deuda.toLocaleString('es-CO')} de ${user.nombre}? Se limpiará su saldo.`)) {
            user.deuda = 0;
            user.faltas = 0;
            user.historialFaltas = [];
            guardarDatos();
            renderUI();
            if (document.getElementById('user-audit-select').value === userId) {
                cargarAuditoriaIndividual(userId);
            }
        }
    }
}

export function removerPersona(userId) {
    if (confirm('¿Estás seguro de eliminar a esta persona del listado de control?')) {
        removeUser(userId);
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
