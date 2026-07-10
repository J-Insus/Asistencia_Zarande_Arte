import { state } from './state.js';
import { guardarDatos } from './storage.js';
import { getToday } from './date.js';

// Solo evalúa fechas presentes en dbAttendance (días con al menos 1 validación confirmada).
export function evaluarFaltasYMorasAutomaticas() {
    const hoy = getToday();

    Object.keys(state.dbAttendance).forEach(dia => {
        if (dia >= hoy || state.dbEvaluatedDays.includes(dia)) return;

        const listaAsistidosseDia = state.dbAttendance[dia];
        if (!listaAsistidosseDia?.length) return;

        state.dbUsers.forEach(user => {
            const asistio = listaAsistidosseDia.includes(user.id);
            const teniaDeudaPrevia = user.deuda > 0;

            if (teniaDeudaPrevia) {
                user.deuda += 1000;
            }

            if (!asistio) {
                user.faltas += 1;
                user.deuda += 1000;
                if (!user.historialFaltas) user.historialFaltas = [];
                user.historialFaltas.push(dia);
            }
        });
        state.dbEvaluatedDays.push(dia);
    });
    guardarDatos();
}
