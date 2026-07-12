import { state } from './state.js';
import { syncUsuario, marcarDiaEvaluadoCloud, showLoader, hideLoader } from './storage.js';
import { getToday } from './date.js';

export async function evaluarFaltasYMorasAutomaticas() {
    const hoy = getToday();
    const diasConAsistencia = Object.keys(state.dbAttendance);

    for (const dia of diasConAsistencia) {
        if (dia >= hoy || state.dbEvaluatedDays.includes(dia)) continue;

        const listaAsistidosEseDia = state.dbAttendance[dia] || [];
        if (listaAsistidosEseDia.length === 0) continue;

        showLoader();

        for (const user of state.dbUsers) {
            const asistio = listaAsistidosEseDia.includes(user.id);
            const teniaDeudaPrevia = user.deuda > 0;

            let huboCambios = false;

            if (teniaDeudaPrevia) {
                user.deuda += 1000;
                huboCambios = true;
            }

            if (!asistio) {
                user.faltas += 1;
                user.deuda += 1000;
                if (!user.historialFaltas) user.historialFaltas = [];
                user.historialFaltas.push(dia);
                huboCambios = true;
            }

            if (huboCambios) {
                await syncUsuario(user);
            }
        }

        state.dbEvaluatedDays.push(dia);
        await marcarDiaEvaluadoCloud(dia);
        
        hideLoader();
    }
}