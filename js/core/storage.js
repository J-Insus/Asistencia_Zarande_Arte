import { state, setUsers } from './state.js';

const STORAGE_KEYS = {
    users: 'qr_users_v2',
    attendance: 'qr_attendance_v2',
    evaluated: 'qr_evaluated_v2'
};

const DEMO_USERS = [
    { id: 'qr_001', nombre: 'Carlos Mendoza', faltas: 0, deuda: 0, historialFaltas: [] },
    { id: 'qr_002', nombre: 'Ana María Restrepo', faltas: 0, deuda: 0, historialFaltas: [] },
    { id: 'qr_003', nombre: 'Jhoan Camilo Velasquez', faltas: 0, deuda: 0, historialFaltas: [] }
];

export function loadData() {
    localStorage.removeItem('qr_official_days_v2');

    state.dbUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.users)) || [];
    state.dbAttendance = JSON.parse(localStorage.getItem(STORAGE_KEYS.attendance)) || {};
    state.dbEvaluatedDays = JSON.parse(localStorage.getItem(STORAGE_KEYS.evaluated)) || [];

    if (state.dbUsers.length === 0) {
        setUsers([...DEMO_USERS]);
        guardarDatos();
    }
}

export function guardarDatos() {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(state.dbUsers));
    localStorage.setItem(STORAGE_KEYS.attendance, JSON.stringify(state.dbAttendance));
    localStorage.setItem(STORAGE_KEYS.evaluated, JSON.stringify(state.dbEvaluatedDays));
}

export function removeUser(userId) {
    setUsers(state.dbUsers.filter(u => u.id !== userId));
    guardarDatos();
}
