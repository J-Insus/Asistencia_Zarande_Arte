import { state } from './state.js';
import { syncUsuario, marcarDiaEvaluadoCloud, showLoader, hideLoader } from './storage.js';
import { getToday } from './date.js';

export async function evaluarFaltasYMorasAutomaticas() {
    const hoy = getToday();
    // Iteramos sobre las llaves de días reales donde hubo escaneos confirmados
    const diasConAsistencia = Object.keys(state.dbAttendance);

    for (const dia of diasConAsistencia) {
        // Validación estricta: Saltarse el día actual y los días previamente cerrados/evaluados
        if (dia >= hoy || state.dbEvaluatedDays.includes(dia)) continue;

        const listaAsistidosEseDia = state.dbAttendance[dia] || [];
        if (listaAsistidosEseDia.length === 0) continue;

        showLoader();

        for (const user of state.dbUsers) {
            const asistio = listaAsistidosEseDia.includes(user.id);
            const teniaDeudaPrevia = user.deuda > 0;

            let huboCambios = false;

            // 1. Recargo de mora recurrente por saldos históricos vencidos
            if (teniaDeudaPrevia) {
                user.deuda += 1000;
                huboCambios = true;
            }

            // 2. Penalización automática por inasistencia en día activo pasado
            if (!asistio) {
                user.faltas += 1;
                user.deuda += 1000;
                if (!user.historialFaltas) user.historialFaltas = [];
                user.historialFaltas.push(dia);
                huboCambios = true;
            }

            // Impactar base de datos si el usuario acumuló variaciones en su estado financiero
            if (huboCambios) {
                await syncUsuario(user);
            }
        }

        // Registrar el cierre del día evaluado en la memoria local y en Supabase
        state.dbEvaluatedDays.push(dia);
        await marcarDiaEvaluadoCloud(dia);
        
        hideLoader();
    }
}