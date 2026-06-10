import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { nombre, correo, registro_id } = await req.json();

    const accountId    = Deno.env.get('ZOOM_ACCOUNT_ID')!;
    const clientId     = Deno.env.get('ZOOM_CLIENT_ID')!;
    const clientSecret = Deno.env.get('ZOOM_CLIENT_SECRET')!;
    const meetingId    = Deno.env.get('ZOOM_MEETING_ID')!;
    const resendKey    = Deno.env.get('RESEND_API_KEY')!;

    // ── 1. Obtener token de Zoom ──
    const basicAuth = btoa(`${clientId}:${clientSecret}`);
    const tokenRes = await fetch(
      `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
      {
        method: 'POST',
        headers: { Authorization: `Basic ${basicAuth}` },
      }
    );
    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Zoom token error: ${err}`);
    }
    const { access_token } = await tokenRes.json();

    // ── 2. Registrar asistente al meeting ──
    const regRes = await fetch(
      `https://api.zoom.us/v2/meetings/${meetingId}/registrants`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ first_name: nombre, last_name: '.', email: correo }),
      }
    );
    if (!regRes.ok) {
      const err = await regRes.text();
      throw new Error(`Zoom registrant error: ${err}`);
    }
    const { join_url } = await regRes.json();

    // ── 3. Enviar correo con Resend ──
    const emailHtml = buildEmail(nombre, join_url);
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Maratón Milton Ochoa <noreply@aamocolombia.com>',
        to: [correo],
        subject: '¡Tu inscripción a la Maratón del Conocimiento está confirmada!',
        html: emailHtml,
      }),
    });
    if (!emailRes.ok) {
      const err = await emailRes.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(
      JSON.stringify({ ok: true, join_url, registro_id }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});

function buildEmail(nombre: string, joinUrl: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de inscripción</title>
</head>
<body style="margin:0;padding:0;background:#14405B;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#14405B;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#14405B 0%,#0d2d40 100%);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <img
                src="https://maraton-milton-ochoa.vercel.app/logo-milton-ochoa.png"
                alt="Milton Ochoa"
                width="80"
                style="border-radius:8px;background:#fff;padding:8px;display:block;margin:0 auto 16px;"
              />
              <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;line-height:1.2;">
                Maratón del Conocimiento
              </h1>
              <p style="margin:4px 0 0;color:#7AC001;font-size:15px;font-weight:600;letter-spacing:1px;">
                con Milton Ochoa
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#14405B;padding:40px 40px 32px;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 12px;color:#ffffff;font-size:15px;font-weight:700;">
                ¡Hola, ${nombre}!
              </p>
              <p style="margin:0 0 24px;color:#ffffff;font-size:15px;line-height:1.7;">
                Tu inscripción a la <strong>Maratón del Conocimiento con Milton Ochoa</strong>
                ha sido confirmada exitosamente. Estamos muy contentos de contar con tu participación.
              </p>

              <p style="margin:0 0 16px;color:#ffffff;font-size:15px;line-height:1.6;">
                Haz clic en el botón a continuación para unirte al evento en Zoom el día del evento:
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7AC001 0%,#5fa000 100%);border-radius:10px;">
                    <a
                      href="${joinUrl}"
                      style="display:inline-block;padding:16px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.5px;"
                    >
                      Unirme al evento Zoom
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#ffffff;font-size:15px;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 32px;word-break:break-all;">
                <a href="${joinUrl}" style="color:#7AC001;font-size:15px;">${joinUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.15);margin:0 0 24px;" />

              <p style="margin:0;color:#ffffff;font-size:15px;text-align:center;line-height:1.6;">
                © 2026 Milton Ochoa — Expertos en Evaluación<br/>
                Este correo fue enviado porque realizaste un registro en la Maratón del Conocimiento.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
