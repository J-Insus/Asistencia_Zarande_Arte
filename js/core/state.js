export const state = {
    dbUsers: [],
    dbAttendance: {},
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

export function setEvaluatedDays(days) {
    state.dbEvaluatedDays = days;
}
