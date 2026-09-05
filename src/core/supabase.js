import { createClient } from '@supabase/supabase-js'

// Vite lee las variables protegidas de forma nativa con import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Error crítico: Faltan las credenciales de Supabase en el archivo .env")
}

// Exportamos la única instancia del cliente para todo el proyecto
export const supabase = createClient(supabaseUrl, supabaseAnonKey)