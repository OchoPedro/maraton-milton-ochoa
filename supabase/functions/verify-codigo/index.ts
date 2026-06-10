import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { codigo } = await req.json();

    if (!codigo || typeof codigo !== 'string') {
      return new Response(
        JSON.stringify({ valido: false, motivo: 'codigo_requerido' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Usar service role key — bypassea RLS completamente
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('codigos')
      .select('id, codigo, usado')
      .eq('codigo', codigo.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      console.error('[verify-codigo] DB error:', error);
      return new Response(
        JSON.stringify({ valido: false, motivo: 'error_db', detalle: error.message }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ valido: false, motivo: 'no_existe' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    if (data.usado === true) {
      return new Response(
        JSON.stringify({ valido: false, motivo: 'ya_usado' }),
        { headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valido: true, codigo: data.codigo }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[verify-codigo] exception:', err);
    return new Response(
      JSON.stringify({ valido: false, motivo: 'excepcion', detalle: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
