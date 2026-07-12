import { state } from '../core/state.js';
import { registrarAsistenciaCloud, showLoader, hideLoader } from '../core/storage.js';
import { getToday } from '../core/date.js';
import { renderUI } from '../core/render.js';

// ... Las funciones de inicialización y apertura de cámara permanecen intactas ...

// Asegúrate de que tenga "export" al inicio
export function simularEscaneo() {
    const token = document.getElementById('sim-select').value;
    if (token) procesarLecturaQR(token); // O procesarLecturaÛR según tu archivo base
}

// Asegúrate de que tenga "export" al inicio
export function iniciarCamara() {
    if (!state.html5QrcodeScanner) {
        state.html5QrcodeScanner = new Html5Qrcode("reader");
        state.html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => { procesarLecturaQR(decodedText); }
        ).catch(() => alert('Por favor concede permisos para usar la cámara móvil.'));
    }
}

// Asegúrate de que tenga "export" al inicio de forma obligatoria
export function detenerCamara() {
    if (state.html5QrcodeScanner) {
        try {
            state.html5QrcodeScanner.stop();
            state.html5QrcodeScanner = null;
        } catch (e) {
            console.error(e);
        }
    }
}

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