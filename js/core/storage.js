import { setUsers, setAttendance, setPermisos, setEvaluatedDays } from './state.js';
import { state } from './state.js';
const SUPABASE_URL = "https://qniohapbmokobsgklfbg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaW9oYXBibW9rb2JzZ2tsZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTI2MjksImV4cCI6MjA5OTI2ODYyOX0.8SWUpkTIo86abIf_PILqqPGc7ek_pCP-dzL1Xa7RsqA";

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

        const { data: permisosRows, error: errPerm } = await supabaseClient.from('permisos').select('*');
        if (errPerm) throw errPerm;

        const { data: evaluatedRows, error: errEval } = await supabaseClient.from('dias_evaluados').select('*');
        if (errEval) throw errEval;

        const formattedAttendance = {};
        attendanceRows.forEach(row => {
            if (!formattedAttendance[row.fecha]) formattedAttendance[row.fecha] = [];
            formattedAttendance[row.fecha].push(row.usuario_id);
        });

        const formattedPermisos = {};
        permisosRows.forEach(row => {
            if (!formattedPermisos[row.fecha]) formattedPermisos[row.fecha] = [];
            formattedPermisos[row.fecha].push(row.usuario_id);
        });

        setUsers(users.map(u => ({
            id: u.id,
            nombre: u.nombre,
            faltas: u.faltas,
            deuda: u.deuda,
            historialFaltas: u.historial_faltas || []
        })));
        
        setAttendance(formattedAttendance);
        setPermisos(formattedPermisos);
        setEvaluatedDays(evaluatedRows.map(r => r.fecha));

    } catch (error) {
        console.error("Error crítico cargando datos de Supabase:", error);
    } finally {
        hideLoader();
    }
}



export async function syncUsuario(user) {
    // Calculamos el total con la función del Paso 1
    const totales = calcularDatosHistoricos(user, state.dbAttendance);
    
    // Actualizamos el objeto local
    user.deuda = totales.deuda;
    user.faltas = totales.faltas;

    // Guardamos en Supabase el resultado exacto
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

export async function registrarPermisoCloud(fecha, usuarioId) {
    await supabaseClient.from('permisos').upsert({ fecha, usuario_id: usuarioId });
}

export async function removeUser(userId) {
    showLoader();
    await supabaseClient.from('usuarios').delete().eq('id', userId);
    hideLoader();
}

export async function marcarDiaEvaluadoCloud(fecha) {
    await supabaseClient.from('dias_evaluados').upsert({ fecha });
}



// Agrega esta función de utilidad en core/storage.js
function calcularDatosHistoricos(user, dbAttendance) {
    let deudaCalculada = 0;
    let faltasCalculadas = 0;
    const eventos = [];

    // 1. Extraer faltas y permisos del historial del usuario
    if (user.historialFaltas) {
        user.historialFaltas.forEach(f => {
            eventos.push({ 
                fecha: typeof f === 'object' ? f.fecha : f, 
                tipo: f.tipo || 'sin_permiso' 
            });
        });
    }

    // 2. Extraer asistencias del estado global
    if (dbAttendance) {
        for (const [fecha, asistentes] of Object.entries(dbAttendance)) {
            if (asistentes.includes(user.id)) {
                eventos.push({ fecha: fecha, tipo: 'asistencia' });
            }
        }
    }

    // 3. Ordenar cronológicamente (vital para saber en qué momento se generó la deuda)
    eventos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 4. Ejecutar las reglas de negocio sobre la línea de tiempo
    eventos.forEach(ev => {
        // Regla: Si ANTES de este evento ya tiene deuda, se le suman 500 de mora
        if (deudaCalculada > 0) {
            deudaCalculada += 500;
        }

        // Regla: Aplicar el costo específico del evento
        if (ev.tipo === 'sin_permiso') {
            deudaCalculada += 5000;
            faltasCalculadas += 1;
        } else if (ev.tipo === 'con_permiso') {
            deudaCalculada += 1000;
            faltasCalculadas += 1;
        }
        // Si es 'asistencia', suma 0 (solo se le aplicó la mora arriba si debía)
    });

    return { deuda: deudaCalculada, faltas: faltasCalculadas };
}