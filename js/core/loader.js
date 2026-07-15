async function loadPartial(containerId, path) {
    const container = document.getElementById(containerId);
    const response = await fetch(path);
    const html = await response.text();
    container.insertAdjacentHTML('beforeend', html);
}

export async function loadViews() {
    await Promise.all([
        loadPartial('app-main', 'views/escanear.html'),
        loadPartial('app-main', 'views/reportes.html'),
        loadPartial('app-main', 'views/consulta.html'),
        loadPartial('app-main', 'views/gestion.html'),
        loadPartial('app-modal', 'components/modal-confirmacion.html'),
        loadPartial('app-nav', 'components/navigation.html')
    ]);
}
