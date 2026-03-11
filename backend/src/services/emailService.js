import nodemailer from 'nodemailer';

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

const transporter = buildTransporter();

export const sendReportEmail = async (user, report) => {
  const periodLabel = report.period === 'weekly' ? 'Semanal' : 'Mensual';
  const periodDateRange = `${report.startDate} al ${report.endDate}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .summary { background-color: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
        .income { color: #4CAF50; font-weight: bold; }
        .expense { color: #f44336; font-weight: bold; }
        .balance { font-size: 1.2em; margin-top: 10px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Informe ${periodLabel}</h1>
        </div>
        <div class="content">
          <p>Hola <strong>${user.name}</strong>,</p>
          <p>Aquí está tu informe ${periodLabel.toLowerCase()} de gastos e ingresos (${periodDateRange}):</p>
          
          <div class="summary">
            <h3>Resumen</h3>
            <p><span class="income">Ingresos:</span> $${report.summary.income.total.toFixed(2)} (${report.summary.income.count} movimientos)</p>
            <p><span class="expense">Gastos:</span> $${report.summary.expenses.total.toFixed(2)} (${report.summary.expenses.count} movimientos)</p>
            <p class="balance">
              <strong>Balance:</strong> 
              <span style="color: ${report.summary.balance >= 0 ? '#4CAF50' : '#f44336'}">
                $${report.summary.balance.toFixed(2)}
              </span>
            </p>
          </div>

          <p>Total de movimientos: ${report.movements.length}</p>
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
    - Ingresos: $${report.summary.income.total.toFixed(2)} (${report.summary.income.count} movimientos)
    - Gastos: $${report.summary.expenses.total.toFixed(2)} (${report.summary.expenses.count} movimientos)
    - Balance: $${report.summary.balance.toFixed(2)}
    
    Total de movimientos: ${report.movements.length}
  `;

  try {
    if (!process.env.EMAIL_FROM) {
      throw new Error('Falta EMAIL_FROM (remitente).');
    }
    await transporter.sendMail({
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
