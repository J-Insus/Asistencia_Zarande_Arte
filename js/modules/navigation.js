
export function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(el => {
        el.classList.remove('text-brand-green');
        el.classList.add('text-gray-400');
    });

    document.getElementById(tabId).classList.add('active');
    btn.classList.remove('text-gray-400');
    btn.classList.add('text-brand-green');

    
}

export function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab, btn);
        });
    });
}
