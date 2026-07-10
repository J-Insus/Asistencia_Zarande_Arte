import { getToday } from '../core/date.js';

export function exportarPDF() {
    const elemento = document.getElementById('pdf-content');
    const opciones = {
        margin: 12,
        filename: `Reporte-Asistencia-${getToday()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opciones).from(elemento).save();
}

export function initReportsModule() {
    document.getElementById('btn-export-pdf').addEventListener('click', exportarPDF);
}
