import { setUsers, setAttendance, setEvaluatedDays } from './state.js';

// Credenciales de Conexión de Supabase
const SUPABASE_URL = "https://qniohapbmokobsgklfbg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaW9oYXBibW9rb2JzZ2tsZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTI2MjksImV4cCI6MjA5OTI2ODYyOX0.8SWUpkTIo86abIf_PILqqPGc7ek_pCP-dzL1Xa7RsqA";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Funciones Auxiliares para controlar la pantalla de carga andina
export function showLoader() { document.getElementById('cloud-loader').classList.remove('hidden'); }
export function hideLoader() { document.getElementById('cloud-loader').classList.add('hidden'); }

export async function loadData() {
    showLoader();
    try {
        // 1. Obtener los usuarios de la nube
        const { data: users, error: errUsers } = await supabase.from('usuarios').select('*');
        if (errUsers) throw errUsers;

        // 2. Obtener el registro general de asistencias tomadas
        const { data: attendanceRows, error: errAtt } = await supabase.from('asistencias').select('*');
        if (errAtt) throw errAtt;

        // 3. Obtener los días ya procesados por el motor
        const { data: evaluatedRows, error: errEval } = await supabase.from('dias_evaluados').select('*');
        if (errEval) throw errEval;

        // Re-mapeo de datos relacionales al objeto nativo agrupado por fecha { 'YYYY-MM-DD': ['id1', 'id2'] }
        const formattedAttendance = {};
        attendanceRows.forEach(row => {
            if (!formattedAttendance[row.fecha]) formattedAttendance[row.fecha] = [];
            formattedAttendance[row.fecha].push(row.usuario_id);
        });

        // Mutar el estado en memoria de la aplicación
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

// Guarda o actualiza un registro completo de usuario en la nube
export async function syncUsuario(user) {
    await supabase.from('usuarios').upsert({
        id: user.id,
        nombre: user.nombre,
        faltas: user.faltas,
        deuda: user.deuda,
        historial_faltas: user.historialFaltas
    });
}

// Registra una fila de asistencia individual
export async function registrarAsistenciaCloud(fecha, usuarioId) {
    await supabase.from('asistencias').upsert({ fecha, usuario_id: usuarioId });
}

// Elimina una asistencia individual (Condonaciones parciales/correcciones)
export async function eliminarAsistenciaCloud(fecha, usuarioId) {
    await supabase.from('asistencias').delete().eq('fecha', fecha).eq('usuario_id', usuarioId);
}

// Elimina permanentemente a un usuario del directorio cloud
export async function removeUser(userId) {
    showLoader();
    await supabase.from('usuarios').delete().eq('id', userId);
    hideLoader();
}

// Marca una fecha en el registro histórico de cierre de jornadas evaluadas
export async function marcarDiaEvaluadoCloud(fecha) {
    await supabase.from('dias_evaluados').upsert({ fecha });
}