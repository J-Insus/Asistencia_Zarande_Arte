import { loadViews } from './core/loader.js';
import { loadData } from './core/storage.js';
import { evaluarFaltasYMorasAutomaticas } from './core/business-engine.js';
import { renderUI } from './core/render.js';
import { getToday } from './core/date.js';
import { initScanModule } from './modules/escanear.js';
import { initReportsModule } from './modules/reportes.js';
import { initConsultaModule } from './modules/consulta.js';
import { initGestionModule } from './modules/gestion.js';
import { initNavigation } from './modules/navigation.js';

async function initApp() {
    // Bloquear renderizado de UI parcial hasta obtener datos de la nube
    await loadViews();
    await loadData();

    document.getElementById('header-date').innerText = getToday();
    document.getElementById('report-timestamp').innerText = new Date().toLocaleString();

    // Ejecuta el motor asincrónico en cascada
    await evaluarFaltasYMorasAutomaticas();

    initNavigation();
    initScanModule();
    initReportsModule();
    initConsultaModule();
    initGestionModule();
    renderUI();
}

// GESTIÓN DE CONTROL DE ACCESO (LOGIN GATE)
document.getElementById('btn-login').addEventListener('click', () => {
    const user = document.getElementById('auth-user').value;
    const pass = document.getElementById('auth-pass').value;

    if (user === "Adanely" && pass === "mibloque2026") {
        sessionStorage.setItem('session_active', 'true');
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
        initApp();
    } else {
        alert("Credenciales de administración incorrectas.");
    }
});

// Mantener sesión activa ante recargas de página blandas en el navegador
window.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('session_active') === 'true') {
        document.getElementById('auth-gate').classList.add('hidden');
        document.getElementById('app-wrapper').classList.remove('hidden');
        initApp();
    }
});