import { state } from '../core/state.js';
import { registrarAsistenciaCloud, showLoader, hideLoader } from '../core/storage.js';
import { getToday } from '../core/date.js';
import { renderUI } from '../core/render.js';

function procesarLecturaQR(token) {
    const user = state.dbUsers.find(u => u.id === token);
    if (!user) {
        alert('Código QR no registrado en el Directorio.');
        return;
    }
    
    const hoy = getToday();
    const asistenciasHoy = state.dbAttendance[hoy] || [];
    
    if (asistenciasHoy.includes(user.id)) {
        alert(`El asistente ${user.nombre} ya tiene su asistencia VALIDADA para el día de hoy.`);
        return;
    }
    
    document.getElementById('modal-user-name').innerText = user.nombre;
    document.getElementById('modal-timestamp').innerText = `Escaneado a las: ${new Date().toLocaleTimeString()}`;
    state.currentScanToken = token;
    document.getElementById('scan-modal').classList.remove('hidden');
}

function cerrarModal() {
    document.getElementById('scan-modal').classList.add('hidden');
    state.currentScanToken = null;
}

async function confirmarAsistencia() {
    const hoy = getToday();
    
    if (!state.dbAttendance[hoy]) state.dbAttendance[hoy] = [];
    
    if (!state.dbAttendance[hoy].includes(state.currentScanToken)) {
        showLoader();
        try {
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

function simularEscaneo() {
    const token = document.getElementById('sim-select').value;
    if (token) procesarLecturaQR(token);
}

function iniciarCamara() {
    if (!state.html5QrcodeScanner) {
        state.html5QrcodeScanner = new Html5Qrcode("reader");
        state.html5QrcodeScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: 250 },
            (decodedText) => { procesarLecturaQR(decodedText); }
        ).catch(() => alert('Por favor concede permisos para usar la cámara móvil.'));
    }
}

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

export function initScanModule() {
    document.getElementById('btn-modal-confirm').onclick = confirmarAsistencia;
    document.getElementById('btn-modal-reject').onclick = cerrarModal;
    document.getElementById('btn-sim-scan').addEventListener('click', simularEscaneo);
    document.getElementById('btn-start-scan').addEventListener('click', iniciarCamara);
}