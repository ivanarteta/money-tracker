import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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
    console.error(`❌ Error al enviar email a ${user.email}:`, error);
    return false;
  }
};
