import { pool } from '../infrastructure/postgres';
import { sendMail } from '../infrastructure/mailer';
import type { ResultadoEnvioNotificacion, TipoNotificacion } from '../domain/notification';

const FRONTEND_BASE_URL = (process.env['FRONTEND_BASE_URL'] ?? 'http://localhost:5173').replace(/\/$/, '');
const FRONTEND_LOGIN_URL = `${FRONTEND_BASE_URL}/login`;
const FRONTEND_SUBSCRIPTION_URL = `${FRONTEND_BASE_URL}/subscription/plans`;
const FRONTEND_CATALOG_URL = `${FRONTEND_BASE_URL}/panel`;

// ── Paleta y SVG icons ───────────────────────────────────────────────────────

const C = {
  bg:          '#080c14',
  card:        '#0d1220',
  primary:     '#1a5fb4',
  primaryHover:'#164a8e',
  accent:      '#4f95e1',
  textPrimary: '#ffffff',
  textMuted:   '#8cb9ed',
  border:      '#1e2d42',
  borderMed:   '#243550',
  success:     '#16a34a',
  successBg:   '#dcfce7',
  successText: '#14532d',
  warning:     '#ca8a04',
  warningBg:   '#fef9c3',
  infoLight:   '#e4edfa',
  infoDark:    '#164076',
};

// Todos los iconos son Lucide-style (stroke, sin fill) para mantener coherencia con el frontend
const ICON = {
  clapperboard: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4f95e1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1-.3 2.1.3 2.4 1.3Z"/><path d="m6.2 5.3 3.1 3.9"/><path d="m12.4 3.4 3.1 3.9"/><path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/></svg>`,

  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#dcfce7" stroke="#16a34a" stroke-width="1.5"/><polyline points="9,12 11,14 15,10" stroke="#16a34a" stroke-width="2.5" fill="none"/></svg>`,

  checkSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#14532d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:5px;"><polyline points="20 6 9 17 4 12"/></svg>`,

  playCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f95e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#4f95e1" stroke="#4f95e1" stroke-width="1"/></svg>`,

  users: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f95e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,

  star: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4f95e1" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

  starSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#ca8a04" stroke="#ca8a04" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:5px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,

  tvSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#164076" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,

  filmSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#164076" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:4px;"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,

  tvBtn: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>`,

  filmBtn: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;"><rect x="2" y="2" width="20" height="20" rx="2" ry="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>`,
};

function emailWrapper(headerAccent: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Quetzal TV</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Accent bar -->
          <tr>
            <td style="background:linear-gradient(90deg,${C.primaryHover} 0%,${C.primary} 50%,${C.accent} 100%);height:4px;border-radius:8px 8px 0 0;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header / Logo -->
          <tr>
            <td style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:${C.textPrimary};letter-spacing:-0.5px;">
                      ${ICON.clapperboard}Quetzal&nbsp;<span style="color:${C.accent};">TV</span>
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:${C.textMuted};letter-spacing:1px;text-transform:uppercase;">Plataforma de Streaming</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:0 40px;">
              <div style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:${C.card};border-left:1px solid ${C.border};border-right:1px solid ${C.border};padding:36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:${C.bg};border:1px solid ${C.border};border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:13px;color:${C.textMuted};">
                &copy; 2026 Quetzal TV &mdash; Todos los derechos reservados
              </p>
              <p style="margin:0;font-size:11px;color:${C.border};">
                Este es un correo automático. Por favor no respondas a este mensaje.
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

// ── Templates HTML ────────────────────────────────────────────────────────────

function tmplConfirmacionRegistro(nombre: string): { asunto: string; html: string } {
  const body = `
    <!-- Icon -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom:28px;">
          ${ICON.checkCircle}
        </td>
      </tr>
    </table>

    <!-- Title -->
    <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:800;color:${C.textPrimary};text-align:center;letter-spacing:-0.5px;">
      ¡Bienvenido, ${nombre}!
    </h1>
    <p style="margin:0 0 32px 0;font-size:16px;color:${C.textMuted};text-align:center;line-height:1.6;">
      Tu cuenta en <strong style="color:${C.accent};">Quetzal TV</strong> ha sido creada exitosamente.
    </p>

    <!-- Divider -->
    <div style="height:1px;background-color:${C.border};margin-bottom:32px;">&nbsp;</div>

    <!-- Features -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td width="33%" align="center" style="padding:16px 8px;background-color:${C.bg};border:1px solid ${C.border};border-radius:10px;">
          <div style="margin-bottom:10px;">${ICON.playCircle}</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:${C.textPrimary};">Catálogo ilimitado</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:${C.textMuted};">Miles de títulos</p>
        </td>
        <td width="4%"></td>
        <td width="33%" align="center" style="padding:16px 8px;background-color:${C.bg};border:1px solid ${C.border};border-radius:10px;">
          <div style="margin-bottom:10px;">${ICON.users}</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:${C.textPrimary};">Hasta 5 perfiles</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:${C.textMuted};">Para toda la familia</p>
        </td>
        <td width="4%"></td>
        <td width="33%" align="center" style="padding:16px 8px;background-color:${C.bg};border:1px solid ${C.border};border-radius:10px;">
          <div style="margin-bottom:10px;">${ICON.star}</div>
          <p style="margin:0;font-size:13px;font-weight:600;color:${C.textPrimary};">Alta calidad</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:${C.textMuted};">HD y 4K disponible</p>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <a href="${FRONTEND_LOGIN_URL}" style="display:inline-block;background-color:${C.primary};color:${C.textPrimary};font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            Explorar catálogo &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    asunto: '¡Bienvenido a Quetzal TV! Tu cuenta está lista',
    html: emailWrapper(C.primary, body),
  };
}

function tmplRecibo(opts: {
  nombre: string;
  id_transaccion: string;
  descripcion_plan: string;
  monto: number;
  moneda: string;
  fecha: string;
}): { asunto: string; html: string } {
  const body = `
    <!-- Badge -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <span style="display:inline-block;background-color:${C.successBg};color:${C.successText};font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:0.5px;text-transform:uppercase;">
            ${ICON.checkSmall}Pago aprobado
          </span>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <h1 style="margin:0 0 6px 0;font-size:26px;font-weight:800;color:${C.textPrimary};text-align:center;">
      Recibo de pago
    </h1>
    <p style="margin:0 0 28px 0;font-size:15px;color:${C.textMuted};text-align:center;">
      Hola <strong style="color:${C.textPrimary};">${opts.nombre}</strong>, aquí está el resumen de tu transacción.
    </p>

    <!-- Receipt card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};border:1px solid ${C.border};border-radius:10px;margin-bottom:24px;overflow:hidden;">
      <tr>
        <td style="background-color:${C.primaryHover};padding:12px 20px;">
          <p style="margin:0;font-size:11px;font-weight:700;color:${C.infoLight};letter-spacing:1px;text-transform:uppercase;">Detalles de la transacción</p>
        </td>
      </tr>
      <tr>
        <td style="padding:0;">
          <table width="100%" cellpadding="14" cellspacing="0" border="0">
            <tr style="border-bottom:1px solid ${C.border};">
              <td style="font-size:13px;color:${C.textMuted};font-weight:500;border-bottom:1px solid ${C.border};">ID Transacción</td>
              <td align="right" style="font-size:13px;color:${C.textPrimary};font-family:monospace;border-bottom:1px solid ${C.border};">${opts.id_transaccion}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:${C.textMuted};font-weight:500;border-bottom:1px solid ${C.border};">Plan contratado</td>
              <td align="right" style="font-size:13px;font-weight:600;color:${C.accent};border-bottom:1px solid ${C.border};">${opts.descripcion_plan}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:${C.textMuted};font-weight:500;border-bottom:1px solid ${C.border};">Fecha de pago</td>
              <td align="right" style="font-size:13px;color:${C.textPrimary};border-bottom:1px solid ${C.border};">${opts.fecha}</td>
            </tr>
            <tr>
              <td style="font-size:15px;font-weight:700;color:${C.textPrimary};">Total cobrado</td>
              <td align="right" style="font-size:20px;font-weight:800;color:${C.accent};">${opts.monto.toFixed(2)} <span style="font-size:13px;">${opts.moneda}</span></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Note -->
    <p style="margin:0 0 24px 0;font-size:13px;color:${C.textMuted};text-align:center;line-height:1.6;">
      Puedes consultar el historial completo de tus pagos en la sección <strong style="color:${C.textPrimary};">Mi cuenta</strong> de la plataforma.
    </p>

    <!-- Divider -->
    <div style="height:1px;background-color:${C.border};margin-bottom:24px;">&nbsp;</div>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <a href="${FRONTEND_SUBSCRIPTION_URL}" style="display:inline-block;background-color:${C.primary};color:${C.textPrimary};font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
            Ver mi suscripción &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    asunto: `Recibo de pago — ${opts.descripcion_plan}`,
    html: emailWrapper(C.success, body),
  };
}

function tmplAlertaPublicacion(opts: {
  titulo: string;
  tipo: string;
  descripcion: string;
}): { asunto: string; html: string } {
  const esSerie    = opts.tipo.toLowerCase() === 'serie';
  const tipoLabel  = esSerie ? 'Serie' : 'Película';
  const tipoIconSm = esSerie ? ICON.tvSmall   : ICON.filmSmall;
  const tipoIconBtn= esSerie ? ICON.tvBtn     : ICON.filmBtn;

  const body = `
    <!-- Badge nuevo -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <span style="display:inline-block;background-color:${C.warningBg};color:${C.warning};font-size:12px;font-weight:700;padding:5px 14px;border-radius:20px;letter-spacing:0.8px;text-transform:uppercase;">
            ${ICON.starSmall}Nuevo contenido disponible
          </span>
        </td>
      </tr>
    </table>

    <!-- Content card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.bg};border:1px solid ${C.borderMed};border-radius:12px;margin-bottom:28px;overflow:hidden;">
      <!-- Top gradient bar -->
      <tr>
        <td style="background:linear-gradient(90deg,${C.primaryHover} 0%,${C.primary} 60%,${C.accent} 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:28px 28px 24px 28px;">
          <!-- Type badge -->
          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
            <tr>
              <td style="background-color:${C.infoLight};color:${C.infoDark};font-size:11px;font-weight:700;padding:4px 12px;border-radius:20px;letter-spacing:0.5px;">
                ${tipoIconSm}${tipoLabel}
              </td>
            </tr>
          </table>

          <!-- Title -->
          <h1 style="margin:0 0 12px 0;font-size:26px;font-weight:800;color:${C.textPrimary};letter-spacing:-0.5px;line-height:1.2;">
            ${opts.titulo}
          </h1>

          <!-- Description -->
          <p style="margin:0;font-size:15px;color:${C.textMuted};line-height:1.7;">
            ${opts.descripcion}
          </p>
        </td>
      </tr>
    </table>

    <!-- Message -->
    <p style="margin:0 0 28px 0;font-size:14px;color:${C.textMuted};text-align:center;line-height:1.6;">
      Este título ya está disponible en tu catálogo de <strong style="color:${C.accent};">Quetzal TV</strong>.<br>
      ¡No te lo pierdas!
    </p>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center">
          <a href="${FRONTEND_CATALOG_URL}" style="display:inline-block;background-color:${C.primary};color:${C.textPrimary};font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;letter-spacing:0.3px;">
            ${tipoIconBtn}Ver ahora
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    asunto: `[Nuevo en Quetzal TV] ${opts.titulo}`,
    html: emailWrapper(C.warning, body),
  };
}

// ── Persistencia ──────────────────────────────────────────────────────────────

async function registrarNotificacion(opts: {
  tipo: TipoNotificacion;
  correo_destino: string;
  asunto: string;
  estado: 'enviado' | 'fallido';
  error_mensaje: string | null;
}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `CALL sp_registrar_notificacion($1, $2, $3, $4, $5, NULL)`,
    [opts.tipo, opts.correo_destino, opts.asunto, opts.estado, opts.error_mensaje],
  );
  // El procedimiento devuelve el id por parámetro OUT; si no hay fila, usamos query directo.
  if (rows.length > 0 && rows[0]?.id) return rows[0].id;
  const { rows: r2 } = await pool.query<{ id: string }>(
    `INSERT INTO notificaciones(tipo, correo_destino, asunto, estado, error_mensaje, enviado_en)
     VALUES($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      opts.tipo,
      opts.correo_destino,
      opts.asunto,
      opts.estado,
      opts.error_mensaje,
      opts.estado === 'enviado' ? new Date() : null,
    ],
  );
  return r2[0]!.id;
}

// ── Casos de uso ──────────────────────────────────────────────────────────────

export async function enviarConfirmacionRegistro(
  correo: string,
  nombre: string,
): Promise<ResultadoEnvioNotificacion> {
  const { asunto, html } = tmplConfirmacionRegistro(nombre);
  let estado: 'enviado' | 'fallido' = 'enviado';
  let errorMsg: string | null = null;

  try {
    await sendMail({ to: correo, subject: asunto, html });
  } catch (err) {
    estado = 'fallido';
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[notificaciones] confirmacion_registro send error:', errorMsg);
  }

  const id = await registrarNotificacion({
    tipo: 'confirmacion_registro',
    correo_destino: correo,
    asunto,
    estado,
    error_mensaje: errorMsg,
  });

  return { id, enviado: estado === 'enviado', error_mensaje: errorMsg };
}

export async function enviarRecibo(opts: {
  correo_destino: string;
  nombre_usuario: string;
  id_transaccion: string;
  descripcion_plan: string;
  monto: number;
  moneda: string;
  fecha: string;
}): Promise<ResultadoEnvioNotificacion> {
  const { asunto, html } = tmplRecibo({
    nombre: opts.nombre_usuario,
    id_transaccion: opts.id_transaccion,
    descripcion_plan: opts.descripcion_plan,
    monto: opts.monto,
    moneda: opts.moneda,
    fecha: opts.fecha,
  });
  let estado: 'enviado' | 'fallido' = 'enviado';
  let errorMsg: string | null = null;

  try {
    await sendMail({ to: opts.correo_destino, subject: asunto, html });
  } catch (err) {
    estado = 'fallido';
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[notificaciones] recibo send error:', errorMsg);
  }

  const id = await registrarNotificacion({
    tipo: 'recibo',
    correo_destino: opts.correo_destino,
    asunto,
    estado,
    error_mensaje: errorMsg,
  });

  return { id, enviado: estado === 'enviado', error_mensaje: errorMsg };
}

export async function enviarAlertaPublicacion(opts: {
  correos_destino: string[];
  titulo_contenido: string;
  tipo_contenido: string;
  descripcion: string;
}): Promise<ResultadoEnvioNotificacion> {
  const { asunto, html } = tmplAlertaPublicacion({
    titulo: opts.titulo_contenido,
    tipo: opts.tipo_contenido,
    descripcion: opts.descripcion,
  });

  let estado: 'enviado' | 'fallido' = 'enviado';
  let errorMsg: string | null = null;
  const primerCorreo = opts.correos_destino[0] ?? 'multiple';

  try {
    // Se envía como BCC para no exponer los correos entre suscriptores.
    await sendMail({ to: opts.correos_destino, subject: asunto, html });
  } catch (err) {
    estado = 'fallido';
    errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[notificaciones] alerta_publicacion send error:', errorMsg);
  }

  const id = await registrarNotificacion({
    tipo: 'alerta_publicacion',
    correo_destino: primerCorreo,
    asunto,
    estado,
    error_mensaje: errorMsg,
  });

  return { id, enviado: estado === 'enviado', error_mensaje: errorMsg };
}
