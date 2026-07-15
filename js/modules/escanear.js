import { state } from '../core/state.js';
import { registrarAsistenciaCloud, registrarPermisoCloud, syncUsuario, showLoader, hideLoader } from '../core/storage.js';
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
    
    // Verificar si ya tiene asistencia hoy
    if (asistenciasHoy.includes(user.id)) {
        alert(`El asistente ${user.nombre} ya tiene su asistencia VALIDADA para el día de hoy.`);
        return;
    }

    // Verificar si ya fue evaluado hoy (permiso o falta)
    const yaEvaluado = user.historialFaltas.some(f => f.fecha === hoy);
    if (yaEvaluado) {
        alert(`El asistente ${user.nombre} ya fue marcado con FALTA o PERMISO el día de hoy.`);
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
    const user = state.dbUsers.find(u => u.id === state.currentScanToken);
    
    if (!state.dbAttendance[hoy]) state.dbAttendance[hoy] = [];

    if (!state.dbAttendance[hoy].includes(user.id)) {
        showLoader();
        try {
            // Guardar asistencia en la nube
            await registrarAsistenciaCloud(hoy, user.id);
            state.dbAttendance[hoy].push(user.id);
            
            // Sincronizar: se evaluará si tenía deudas previas para sumarle la mora de $500
            await syncUsuario(user);
        } catch (e) {
            console.error(e);
        } finally {
            hideLoader();
        }
    }
    cerrarModal();
    renderUI();
}

async function registrarPermiso() {
    const hoy = getToday();
    const user = state.dbUsers.find(u => u.id === state.currentScanToken);
    
    if (!state.dbPermisos[hoy]) state.dbPermisos[hoy] = [];

    if (!state.dbPermisos[hoy].includes(user.id)) {
        showLoader();
        try {
            // Guardar permiso en la nube
            await registrarPermisoCloud(hoy, user.id);
            state.dbPermisos[hoy].push(user.id);
            
            // Registramos la inasistencia con permiso únicamente como dato histórico
            user.historialFaltas.push({ fecha: hoy, tipo: 'con_permiso' });
            
            // Sincronizar: el motor calculará los $1.000 más los $500 de mora si correspondía
            await syncUsuario(user);
            
            alert("Permiso registrado. Los cálculos se actualizaron basándose en los datos.");
        } catch (e) {
            console.error(e);
        } finally {
            hideLoader();
        }
    }
    cerrarModal();
    renderUI();
}

async function registrarFalta() {
    const hoy = getToday();
    const user = state.dbUsers.find(u => u.id === state.currentScanToken);
    
    showLoader();
    try {
        // Registramos la falta injustificada únicamente como dato histórico
        user.historialFaltas.push({ fecha: hoy, tipo: 'sin_permiso' });
        
        // Sincronizar: el motor calculará los $5.000 más los $500 de mora si correspondía
        await syncUsuario(user);
        
        alert("Falta injustificada registrada. Los cálculos se actualizaron basándose en los datos.");
    } catch (e) {
        console.error(e);
    } finally {
        hideLoader();
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
    document.getElementById('btn-modal-permission').onclick = registrarPermiso;
    document.getElementById('btn-modal-absence').onclick = registrarFalta;
    document.getElementById('btn-modal-reject').onclick = cerrarModal;
    document.getElementById('btn-sim-scan').addEventListener('click', simularEscaneo);
    document.getElementById('btn-start-scan').addEventListener('click', iniciarCamara);
}