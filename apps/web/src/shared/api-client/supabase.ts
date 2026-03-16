import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pugasfsnckeyitjemvju.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Z2FzZnNuY2tleWl0amVtdmp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTM5MTMsImV4cCI6MjA4MTQ2OTkxM30.XDAdVZOenvzsJRxXbDkfuxIUxkGgxKWo6q6jFFPCNjg';

/**
 * Configuración de Supabase con persistencia de sesión mejorada
 * 
 * Opciones de persistencia:
 * - 'local': localStorage (persiste entre sesiones del navegador, ~7 días por defecto)
 * - 'session': sessionStorage (solo durante la sesión del navegador)
 * - 'none': No persiste (solo en memoria)
 * 
 * Por defecto, Supabase usa localStorage y las sesiones duran:
 * - Access token: 1 hora (3600 segundos)
 * - Refresh token: 7 días (604800 segundos)
 * 
 * La sesión se renueva automáticamente cuando el access token expira,
 * usando el refresh token que está guardado en localStorage.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persistir la sesión en localStorage (por defecto)
    // Esto permite que la sesión persista entre pestañas y reinicios del navegador
    persistSession: true,
    
    // Auto-refresh de la sesión cuando el token está cerca de expirar
    autoRefreshToken: true,
    
    // Detectar cuando el usuario vuelve a la pestaña y verificar la sesión
    detectSessionInUrl: true,
    
    // Storage para la sesión (localStorage por defecto)
    // localStorage persiste entre sesiones del navegador
    // sessionStorage solo persiste durante la sesión actual
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    
    // Storage key personalizado (opcional)
    storageKey: 'sb-auth-token',
    
    // Flujo de autenticación
    flowType: 'pkce', // Usar PKCE para mayor seguridad
  },
});











