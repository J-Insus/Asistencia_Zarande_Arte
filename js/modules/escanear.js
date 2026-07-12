import state from '../core/state.js';
import { registrarAsistenciaCloud, showLoader, hideLoader } from '../core/storage.js';
import { getToday } from '../core/date.js';
import renderUI from '../core/render.js';

// ... Las funciones de inicialización y apertura de cámara permanecen intactas ...

async function confirmarAsistencia() {
    const hoy = getToday();
    
    if (!state.dbAttendance[hoy]) state.dbAttendance[hoy] = [];
    
    if (!state.dbAttendance[hoy].includes(state.currentScanToken)) {
        showLoader();
        try {
            // Guardado persistente en la tabla remota
            await registrarAsistenciaCloud(hoy, state.currentScanToken);
            state.dbAttendance[hoy].push(state.currentScanToken);
        } catch (e) {
            console.error(e);
        } finally {
            hideLoader();
        }
    }
    
    cerrarModal();
    renderUI();
}

// Asegurar vinculación del evento asíncrono
export function initScanModule() {
    document.getElementById('btn-modal-confirm').onclick = confirmarAsistencia;
    document.getElementById('btn-modal-reject').onclick = cerrarModal;
    document.getElementById('btn-sim-scan').addEventListener('click', simularEscaneo);
    document.getElementById('btn-start-scan').addEventListener('click', iniciarCamara);
}