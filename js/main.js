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
    await loadViews();

    loadData();

    document.getElementById('header-date').innerText = getToday();
    document.getElementById('report-timestamp').innerText = new Date().toLocaleString();

    evaluarFaltasYMorasAutomaticas();

    initNavigation();
    initScanModule();
    initReportsModule();
    initConsultaModule();
    initGestionModule();

    renderUI();
}

window.addEventListener('DOMContentLoaded', initApp);
