import { setUsers, setAttendance, setPermisos, setEvaluatedDays } from './state.js';
import { state } from './state.js';

const SUPABASE_URL = "https://qniohapbmokobsgklfbg.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaW9oYXBibW9rb2JzZ2tsZmJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTI2MjksImV4cCI6MjA5OTI2ODYyOX0.8SWUpkTIo86abIf_PILqqPGc7ek_pCP-dzL1Xa7RsqA";

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export function showLoader() { document.getElementById('cloud-loader').classList.remove('hidden'); }
export function hideLoader() { document.getElementById('cloud-loader').classList.add('hidden'); }


// MOTOR DE CALCULO CENTRALIZADO EN STORAGE.JS
export function calcularDatosHistoricos(user, dbAttendance) {
    let deudaCalculada = 0;
    let faltasCalculadas = 0;
    const eventos = [];
    const desglose = []; 
  
    // 1. Extraer faltas del historial del usuario
    if (user.historialFaltas) {
      user.historialFaltas.forEach(f => {
        const fechaFalta = typeof f === 'object' ? f.fecha : f;
        const tipoFalta = typeof f === 'object' ? f.tipo : 'sin_permiso';
        eventos.push({
          fecha: fechaFalta,
          tipo: tipoFalta
        });
      });
    }
  
    // 2. Extraer permisos de la tabla "permisos" (state.dbPermisos)
    if (state.dbPermisos) {
      for (const [fecha, autorizados] of Object.entries(state.dbPermisos)) {
        if (autorizados.includes(user.id)) {
          eventos.push({ fecha: fecha, tipo: 'con_permiso' });
        }
      }
    }
  
    // 3. Extraer asistencias de la tabla "asistencias" (state.dbAttendance)
    if (dbAttendance) {
      for (const [fecha, asistentes] of Object.entries(dbAttendance)) {
        if (asistentes.includes(user.id)) {
          eventos.push({ fecha: fecha, tipo: 'asistencia' });
        }
      }
    }
  
    // 4. Eliminar duplicados de fecha (por si un permiso está en el historial y en la tabla permisos)
    const fechasUnicas = {};
    const eventosFiltrados = eventos.filter(ev => {
      if (fechasUnicas[ev.fecha]) {
        // Priorizar permisos o asistencias sobre faltas simples en caso de colisión
        if (ev.tipo !== 'sin_permiso') {
          fechasUnicas[ev.fecha] = ev;
        }
        return false;
      }
      fechasUnicas[ev.fecha] = ev;
      return true;
    });
  
    // 5. Ordenar cronológicamente
    eventosFiltrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  
    // 6. Ejecutar las reglas de negocio sobre la línea de tiempo
    eventosFiltrados.forEach(ev => {
      // REGLA: Si ANTES de este evento ya tiene deuda, se le aplican 500 de mora
      if (deudaCalculada > 0) {
        deudaCalculada += 500;
        desglose.push({
          fecha: ev.fecha,
          concepto: 'Recargo por Mora (Saldo Pendiente)',
          valor: 500,
          esMora: true
        });
      }
  
      // REGLA: Aplicar el costo específico del evento
      if (ev.tipo === 'sin_permiso') {
        deudaCalculada += 5000;
        faltasCalculadas += 1;
        desglose.push({
          fecha: ev.fecha,
          concepto: 'Falta Injustificada',
          valor: 5000,
          esMora: false
        });
      } else if (ev.tipo === 'con_permiso') {
        deudaCalculada += 1000;
        faltasCalculadas += 1;
        desglose.push({
          fecha: ev.fecha,
          concepto: 'Falta Justificada (Permiso)',
          valor: 1000,
          esMora: false
        });
      }
    });
  
    return { deuda: deudaCalculada, faltas: faltasCalculadas, desglose };
  }






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
    // Calculamos el total con el motor centralizado
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