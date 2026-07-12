import { setUsers, setAttendance, setEvaluatedDays } from './state.js';

// Credenciales de Conexión de Supabase (Reemplaza con las tuyas)
const SUPABASE_URL = "https://qniohapbmokobsgklfbg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaW9oYXBibW9rb2JzZ2tsZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTI2MjksImV4cCI6MjA5OTI2ODYyOX0.8SWUpkTIo86abIf_PILqqPGc7ek_pCP-dzL1Xa7RsqA";

// CORRECCIÓN: El CDN expone la variable global 'supabase'
export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function showLoader() { document.getElementById('cloud-loader').classList.remove('hidden'); }
export function hideLoader() { document.getElementById('cloud-loader').classList.add('hidden'); }

export async function loadData() {
    showLoader();
    try {
        const { data: users, error: errUsers } = await supabaseClient.from('usuarios').select('*');
        if (errUsers) throw errUsers;

        const { data: attendanceRows, error: errAtt } = await supabaseClient.from('asistencias').select('*');
        if (errAtt) throw errAtt;

        const { data: evaluatedRows, error: errEval } = await supabaseClient.from('dias_evaluados').select('*');
        if (errEval) throw errEval;

        const formattedAttendance = {};
        attendanceRows.forEach(row => {
            if (!formattedAttendance[row.fecha]) formattedAttendance[row.fecha] = [];
            formattedAttendance[row.fecha].push(row.usuario_id);
        });

        setUsers(users.map(u => ({
            id: u.id,
            nombre: u.nombre,
            faltas: u.faltas,
            deuda: u.deuda,
            historialFaltas: u.historial_faltas || []
        })));
        
        setAttendance(formattedAttendance);
        setEvaluatedDays(evaluatedRows.map(r => r.fecha));

    } catch (error) {
        console.error("Error crítico cargando datos de Supabase:", error);
    } finally {
        hideLoader();
    }
}

export async function syncUsuario(user) {
    await supabaseClient.from('usuarios').upsert({
        id: user.id,
        nombre: user.nombre,
        faltas: user.faltas,
        deuda: user.deuda,
        historial_faltas: user.historialFaltas
    });
}

export async function registrarAsistenciaCloud(fecha, usuarioId) {
    await supabaseClient.from('asistencias').upsert({ fecha, usuario_id: usuarioId });
}

export async function eliminarAsistenciaCloud(fecha, usuarioId) {
    await supabaseClient.from('asistencias').delete().eq('fecha', fecha).eq('usuario_id', usuarioId);
}

export async function removeUser(userId) {
    showLoader();
    await supabaseClient.from('usuarios').delete().eq('id', userId);
    hideLoader();
}

export async function marcarDiaEvaluadoCloud(fecha) {
    await supabaseClient.from('dias_evaluados').upsert({ fecha });
}