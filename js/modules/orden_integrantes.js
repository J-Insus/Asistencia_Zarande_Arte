import { state } from '../core/state.js';
import { guardarOrdenCloud, showLoader, hideLoader } from '../core/storage.js';

let modoOrden = false;
let pressTimer = null;
let draggedElement = null;

// Exportamos esta función para saber si debemos bloquear el clic normal
export function isModoOrden() {
    return modoOrden;
}

export function configurarLongPress(btn, userId) {
    // Eventos ratón
    btn.addEventListener('mousedown', iniciarContador);
    btn.addEventListener('mouseup', cancelarContador);
    btn.addEventListener('mouseleave', cancelarContador);

    // Eventos táctiles
    btn.addEventListener('touchstart', iniciarContador, { passive: true });
    btn.addEventListener('touchend', cancelarContador);
    btn.addEventListener('touchcancel', cancelarContador);
}

function iniciarContador(e) {
    if (modoOrden) return;
    pressTimer = setTimeout(() => {
        activarModoOrden();
    }, 4000); // 4 segundos exactos
}

function cancelarContador() {
    if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
    }
}

function activarModoOrden() {
    modoOrden = true;
    const grid = document.getElementById('grid-asistentes');
    grid.classList.add('grid-editable');

    // Vibración en móviles (feedback)
    if (navigator.vibrate) navigator.vibrate(100);

    // Gestión de los botones (Deshabilitar asistencia, habilitar orden)
    const btnGuardarAsistencia = document.getElementById('btn-guardar-asistencia');
    const btnGuardarOrden = document.getElementById('btn-guardar-orden');

    btnGuardarAsistencia.disabled = true;
    btnGuardarAsistencia.classList.add('opacity-50', 'cursor-not-allowed');
    btnGuardarOrden.classList.remove('hidden');

    alert("Modo edición de puestos activado. Arrastra las tarjetas para reordenarlas.");

    // Habilitar la propiedad drag & drop
    const tarjetas = grid.querySelectorAll('.user-card');
    tarjetas.forEach(t => {
        t.setAttribute('draggable', 'true');
        t.addEventListener('dragstart', handleDragStart);
        t.addEventListener('dragover', handleDragOver);
        t.addEventListener('dragenter', handleDragEnter);
        t.addEventListener('dragleave', handleDragLeave);
        t.addEventListener('drop', handleDrop);
        t.addEventListener('dragend', handleDragEnd);
    });
}

// --- LOGICA DE ARRASTRAR Y SOLTAR ---
function handleDragStart(e) {
    if (!modoOrden) return;
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    e.preventDefault();

    const targetElement = this;

    if (draggedElement && draggedElement !== targetElement) {
        // --- LÓGICA DE SWAP 1 A 1 (INTERCAMBIO DIRECTO DE POSICIONES) ---
        const placeholder = document.createElement('div');
        
        // 1. Marcar la posición del elemento destino con el placeholder
        targetElement.parentNode.insertBefore(placeholder, targetElement);
        // 2. Mover el elemento destino a la posición original del elemento arrastrado
        draggedElement.parentNode.insertBefore(targetElement, draggedElement);
        // 3. Mover el elemento arrastrado a la posición donde estaba el destino (placeholder)
        placeholder.parentNode.insertBefore(draggedElement, placeholder);
        // 4. Eliminar el placeholder temporal
        placeholder.remove();

        // --- ANIMACIÓN DE FEEDBACK VISUAL PARA AMBAS TARJETAS ---
        const keyframes = [
            { transform: 'scale(0.85)', opacity: '0.7' },
            { transform: 'scale(1.1)', opacity: '1' },
            { transform: 'scale(1)', opacity: '1' }
        ];
        
        const timing = {
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        };

        draggedElement.animate(keyframes, timing);
        targetElement.animate(keyframes, timing);

        // Feedback táctil en móviles al concretar el intercambio
        if (navigator.vibrate) navigator.vibrate(50);
    }

    targetElement.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    const tarjetas = document.querySelectorAll('.user-card');
    tarjetas.forEach(t => t.classList.remove('drag-over'));
}

export async function guardarOrden() {
    const grid = document.getElementById('grid-asistentes');
    const tarjetas = Array.from(grid.querySelectorAll('.user-card'));
    const ordenIds = tarjetas.map(t => t.dataset.userId);

    try {
        await guardarOrdenCloud(ordenIds);

        // Actualizar state.dbUsers para que la vista general ya tenga el nuevo orden
        state.dbUsers.sort((a, b) => {
            const posA = ordenIds.indexOf(a.id);
            const posB = ordenIds.indexOf(b.id);
            return (posA === -1 ? 999999 : posA) - (posB === -1 ? 999999 : posB);
        });

        // Apagar el modo edición y restaurar botones
        modoOrden = false;
        grid.classList.remove('grid-editable');

        const btnGuardarAsistencia = document.getElementById('btn-guardar-asistencia');
        const btnGuardarOrden = document.getElementById('btn-guardar-orden');

        btnGuardarAsistencia.disabled = false;
        btnGuardarAsistencia.classList.remove('opacity-50', 'cursor-not-allowed');
        btnGuardarOrden.classList.add('hidden');

        tarjetas.forEach(t => t.removeAttribute('draggable'));

        alert("¡Orden de puestos guardado de forma permanente!");

    } catch (error) {
        alert("Hubo un problema al guardar el orden. Intenta de nuevo.");
    }
}

export function initOrdenModule() {
    document.getElementById('btn-guardar-orden').addEventListener('click', guardarOrden);
}