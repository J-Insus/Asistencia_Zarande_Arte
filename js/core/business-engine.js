import { state } from './state.js';
import { syncUsuario, marcarDiaEvaluadoCloud, showLoader, hideLoader } from './storage.js';
import { getToday } from './date.js';

export async function evaluarFaltasYMorasAutomaticas() {
    const hoy = getToday();
    const diasConAsistencia = Object.keys(state.dbAttendance);

    for (const dia of diasConAsistencia) {
        if (dia === hoy || state.dbEvaluatedDays.includes(dia)) continue;

        const listaAsistidosEseDia = state.dbAttendance[dia] || [];
        const listaPermisosEseDia = state.dbPermisos[dia] || [];
        
        if (listaAsistidosEseDia.length === 0) continue;

        showLoader();

        for (const user of state.dbUsers) {
            const asistio = listaAsistidosEseDia.includes(user.id);
            const teniaPermiso = listaPermisosEseDia.includes(user.id);
            const teniaDeudaPrevia = user.deuda > 0;
            let huboCambios = false;

            // 1. Regla de Mora: Si debe saldo de antes, suma 500
            if (teniaDeudaPrevia) {
                user.deuda += 500;
                huboCambios = true;
            }

            // 2. Regla de Faltas
            if (!asistio) {
                user.faltas += 1;
                if (!user.historialFaltas) user.historialFaltas = [];

                if (teniaPermiso) {
                    user.deuda += 1000;
                    user.historialFaltas.push({ fecha: dia, tipo: 'con_permiso' });
                } else {
                    user.deuda += 5000;
                    user.historialFaltas.push({ fecha: dia, tipo: 'sin_permiso' });
                }
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

// Añadir en core/business-engine.js
export function calcularDeudaTotal(usuario) {
    let deuda = 0;
    const historial = usuario.historialFaltas || [];

    historial.forEach(registro => {
        // 1. Sumar multa base según tipo
        if (registro.tipo === 'sin_permiso') {
            deuda += 5000;
        } else if (registro.tipo === 'con_permiso') {
            deuda += 1000;
        }

        // 2. Aplicar mora de 500 por cada día adicional de mora
        // (Si el usuario ya tenía deuda antes de este registro, suma 500)
        if (deuda > 5000 || (deuda > 1000 && registro.tipo === 'con_permiso')) {
            deuda += 500;
        }
    });
    
    return deuda;
}