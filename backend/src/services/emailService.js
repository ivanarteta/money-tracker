import nodemailer from 'nodemailer';

const EMAIL_THEME = {
  primary: '#2563eb',
  primarySoft: '#eaf0ff',
  income: '#0ea5e9',
  expense: '#ef4444',
  bg: '#f5f7fb',
  surface: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0'
};

const MAX_MOVEMENTS_IN_EMAIL = 50;

function formatMoney(value, currency = 'EUR', locale = 'es-ES') {
  const number = typeof value === 'number' ? value : parseFloat(value);
  const safe = Number.isFinite(number) ? number : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
}

function escapeHtml(input) {
  return String(input ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTransporter() {
  // Opción 1 (recomendada para Brevo): variables separadas. Sin URL, sin problemas de codificación.
  // Brevo → SMTP & API: usuario = email que muestra, contraseña = SMTP Key (no API key).
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPortRaw = process.env.SMTP_PORT?.trim();
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  if (smtpHost && smtpPortRaw && smtpUser && smtpPass) {
    const port = Number(smtpPortRaw);
    if (!Number.isFinite(port)) throw new Error(`SMTP_PORT inválido: "${smtpPortRaw}"`);
    const secure = port === 465;
    return nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  // Opción 2: URL única (si el usuario tiene caracteres raros, mejor usar SMTP_HOST/USER/PASS).
  const smtpUrlRaw = process.env.SMTP_URL?.trim();
  if (smtpUrlRaw) {
    const smtpUrl =
      (smtpUrlRaw.startsWith('"') && smtpUrlRaw.endsWith('"')) ||
      (smtpUrlRaw.startsWith("'") && smtpUrlRaw.endsWith("'"))
        ? smtpUrlRaw.slice(1, -1)
        : smtpUrlRaw;
    return nodemailer.createTransport(smtpUrl);
  }

  // Opción 3: compatibilidad (EMAIL_*)
  const host = process.env.EMAIL_HOST;
  const portRaw = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (!host || !portRaw || !user || !pass) {
    throw new Error(
      'Configuración de email incompleta. Usa SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS (recomendado), ' +
        'SMTP_URL, o EMAIL_HOST/EMAIL_PORT/EMAIL_USER/EMAIL_PASSWORD.'
    );
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) throw new Error(`EMAIL_PORT inválido: "${portRaw}"`);
  const secure =
    process.env.EMAIL_SECURE != null
      ? String(process.env.EMAIL_SECURE).toLowerCase() === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

let transporter;
function getTransporter() {
  if (!transporter) transporter = buildTransporter();
  return transporter;
}

export const sendReportEmail = async (user, report) => {
  const periodLabel = report.period === 'weekly' ? 'Semanal' : 'Mensual';
  const periodDateRange = `${report.startDate} al ${report.endDate}`;
  const currency = user?.currency || 'EUR';

  const balanceColor = report.summary.balance >= 0 ? EMAIL_THEME.income : EMAIL_THEME.expense;
  const movements = Array.isArray(report.movements) ? report.movements : [];
  const shown = movements.slice(0, MAX_MOVEMENTS_IN_EMAIL);
  const omitted = Math.max(0, movements.length - shown.length);

  const movementsRowsHtml =
    shown.length === 0
      ? `<tr><td colspan="5" style="padding: 14px; color: ${EMAIL_THEME.muted}; text-align: center;">No hay movimientos en este período.</td></tr>`
      : shown
          .map((m, idx) => {
            const type = m.type === 'income' ? 'Ingreso' : 'Gasto';
            const typeColor = m.type === 'income' ? EMAIL_THEME.income : EMAIL_THEME.expense;
            const date = escapeHtml((m.date || '').toString().slice(0, 10));
            const category = escapeHtml(m.category || '-');
            const desc = escapeHtml(m.description || '-');
            const amountNumber = parseFloat(m.amount);
            const amountAbs = Math.abs(Number.isFinite(amountNumber) ? amountNumber : 0);
            const sign = m.type === 'income' ? '+' : '-';
            const amount = `${sign}${formatMoney(amountAbs, currency)}`;
            const zebra = idx % 2 === 0 ? EMAIL_THEME.surface : '#fbfdff';
            return `
              <tr style="background: ${zebra};">
                <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_THEME.border}; color: ${EMAIL_THEME.muted}; white-space: nowrap;">${date}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_THEME.border};">
                  <span style="display:inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; color: ${typeColor}; background: ${
              m.type === 'income' ? '#e6f7ff' : '#ffecec'
            };">
                    ${type}
                  </span>
                </td>
                <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_THEME.border}; color: ${EMAIL_THEME.text};">${category}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_THEME.border}; color: ${EMAIL_THEME.muted}; max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${desc}</td>
                <td style="padding: 10px 12px; border-bottom: 1px solid ${EMAIL_THEME.border}; color: ${typeColor}; font-weight: 800; text-align: right; white-space: nowrap;">${amount}</td>
              </tr>
            `;
          })
          .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: ${EMAIL_THEME.text}; background: ${EMAIL_THEME.bg}; }
        .container { max-width: 760px; margin: 0 auto; padding: 20px; }
        .header { background-color: ${EMAIL_THEME.primary}; color: white; padding: 20px 22px; border-radius: 14px 14px 0 0; }
        .header h1 { margin: 0; font-size: 20px; }
        .header .subtitle { margin-top: 6px; opacity: 0.92; font-size: 13px; }
        .content { background-color: ${EMAIL_THEME.surface}; padding: 20px 22px; border: 1px solid ${EMAIL_THEME.border}; border-top: none; border-radius: 0 0 14px 14px; }
        .summary { background-color: ${EMAIL_THEME.surface}; padding: 14px 16px; margin: 14px 0; border-radius: 12px; border: 1px solid ${EMAIL_THEME.border}; }
        .kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
        .kpi { border-radius: 12px; border: 1px solid ${EMAIL_THEME.border}; padding: 12px; }
        .kpi .label { color: ${EMAIL_THEME.muted}; font-size: 12px; font-weight: 800; letter-spacing: 0.02em; text-transform: uppercase; }
        .kpi .value { margin-top: 6px; font-size: 18px; font-weight: 900; color: ${EMAIL_THEME.text}; }
        .kpi .meta { margin-top: 2px; font-size: 12px; color: ${EMAIL_THEME.muted}; }
        .kpi.income { border-left: 4px solid ${EMAIL_THEME.income}; }
        .kpi.expense { border-left: 4px solid ${EMAIL_THEME.expense}; }
        .kpi.balance { border-left: 4px solid ${EMAIL_THEME.primary}; }
        .footer { text-align: center; margin-top: 16px; color: ${EMAIL_THEME.muted}; font-size: 12px; }
        .table-wrap { margin-top: 14px; border: 1px solid ${EMAIL_THEME.border}; border-radius: 12px; overflow: hidden; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 10px 12px; background: ${EMAIL_THEME.primarySoft}; color: ${EMAIL_THEME.text}; font-size: 12px; }
        th:last-child { text-align: right; }
        .note { margin-top: 10px; font-size: 12px; color: ${EMAIL_THEME.muted}; }
        @media (max-width: 720px) { .kpis { grid-template-columns: 1fr; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Informe ${periodLabel}</h1>
          <div class="subtitle">${escapeHtml(periodDateRange)} · Divisa: ${escapeHtml(currency)}</div>
        </div>
        <div class="content">
          <div class="summary">
            <p style="margin:0 0 8px 0;">Hola <strong>${escapeHtml(user.name)}</strong>,</p>
            <p style="margin:0;">Aquí tienes tu informe ${periodLabel.toLowerCase()} (${escapeHtml(periodDateRange)}).</p>

            <div class="kpis">
              <div class="kpi income">
                <div class="label">Ingresos</div>
                <div class="value">${formatMoney(report.summary.income.total, currency)}</div>
                <div class="meta">${report.summary.income.count} movimientos</div>
              </div>
              <div class="kpi expense">
                <div class="label">Gastos</div>
                <div class="value">${formatMoney(report.summary.expenses.total, currency)}</div>
                <div class="meta">${report.summary.expenses.count} movimientos</div>
              </div>
              <div class="kpi balance">
                <div class="label">Balance</div>
                <div class="value" style="color:${balanceColor};">${formatMoney(report.summary.balance, currency)}</div>
                <div class="meta">${report.summary.balance >= 0 ? 'Superávit' : 'Déficit'}</div>
              </div>
            </div>
          </div>

          <h3 style="margin: 16px 0 8px 0;">Desglose de movimientos (${movements.length})</h3>
          <div class="table-wrap">
            <table role="table" aria-label="Movimientos">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                ${movementsRowsHtml}
              </tbody>
            </table>
          </div>
          ${
            omitted > 0
              ? `<div class="note">Mostrando ${shown.length} de ${movements.length} movimientos. Para ver el detalle completo, abre la app y exporta el informe.</div>`
              : ''
          }
        </div>
        <div class="footer">
          <p>Money Tracker - Gestión de Finanzas Personales</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
    Informe ${periodLabel} - ${periodDateRange}
    
    Hola ${user.name},
    
    Resumen:
    - Divisa: ${currency}
    - Ingresos: ${formatMoney(report.summary.income.total, currency)} (${report.summary.income.count} movimientos)
    - Gastos: ${formatMoney(report.summary.expenses.total, currency)} (${report.summary.expenses.count} movimientos)
    - Balance: ${formatMoney(report.summary.balance, currency)}
    
    Total de movimientos: ${report.movements.length}

    Desglose (primeros ${shown.length}${omitted > 0 ? ` de ${movements.length}` : ''}):
${shown
  .map((m) => {
    const date = (m.date || '').toString().slice(0, 10);
    const type = m.type === 'income' ? 'Ingreso' : 'Gasto';
    const cat = m.category || '-';
    const desc = m.description || '-';
    const amountNumber = parseFloat(m.amount);
    const amountAbs = Math.abs(Number.isFinite(amountNumber) ? amountNumber : 0);
    const sign = m.type === 'income' ? '+' : '-';
    const amount = `${sign}${formatMoney(amountAbs, currency)}`;
    return `    - ${date} | ${type} | ${cat} | ${desc} | ${amount}`;
  })
  .join('\n')}
${omitted > 0 ? `\n    (Se han omitido ${omitted} movimientos en el email. Revisa la app para el detalle completo.)` : ''}
  `;

  try {
    if (!process.env.EMAIL_FROM) {
      throw new Error('Falta EMAIL_FROM (remitente).');
    }
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: `Informe ${periodLabel} - Money Tracker`,
      text: textContent,
      html: htmlContent,
    });
    console.log(`✅ Email enviado a ${user.email}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al enviar email a ${user.email}:`, error?.message || error);
    return false;
  }
};
