export const state = {
    dbUsers: [],
    dbAttendance: {},
    dbPermisos: {},
    dbEvaluatedDays: [],
    html5QrcodeScanner: null,
    currentScanToken: null
};

export function setUsers(users) {
    state.dbUsers = users;
}

export function setAttendance(attendance) {
    state.dbAttendance = attendance;
}

export function setPermisos(permisos) {
    state.dbPermisos = permisos;
}

export function setEvaluatedDays(days) {
    state.dbEvaluatedDays = days;
}