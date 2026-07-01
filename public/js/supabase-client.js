// Cliente de Supabase para el navegador.
// La "publishable key" es segura de exponer públicamente (equivalente a la
// anon key clásica) — el acceso real a los datos lo controla Row Level
// Security en la base de datos, no el secreto de esta key.
const SUPABASE_URL = "https://uckglqhmvfpxzceijnzd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FXSl_UjhzIV69ZgN61Uwzw_NF9tijAC";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
