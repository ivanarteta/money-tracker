import { Movement } from '../models/Movement.js';
import { User } from '../models/User.js';
import PDFDocument from 'pdfkit';

const getDateRange = (period) => {
  const now = new Date();
  let startDate, endDate;

  if (period === 'weekly') {
    // Semana actual (lunes a domingo)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'monthly') {
    // Mes actual
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    throw new Error('Período inválido. Use "weekly" o "monthly"');
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

const isValidISODateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const buildReport = async (userId, { startDate, endDate }) => {
  const movements = await Movement.findAllByUserId(userId, { startDate, endDate });
  const summary = await Movement.getSummary(userId, startDate, endDate);

  const expenses = summary.find(s => s.type === 'expense') || { total: '0', count: '0' };
  const income = summary.find(s => s.type === 'income') || { total: '0', count: '0' };
  const balance = parseFloat(income.total) - parseFloat(expenses.total);

  return {
    startDate,
    endDate,
    movements,
    summary: {
      expenses: {
        total: parseFloat(expenses.total),
        count: parseInt(expenses.count)
      },
      income: {
        total: parseFloat(income.total),
        count: parseInt(income.count)
      },
      balance
    }
  };
};

const writeReportPdfToResponse = ({ res, title, filename, user, report, subtitleLines = [] }) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text(title, { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Usuario: ${user?.name || '-'} (${user?.email || '-'})`);
  for (const line of subtitleLines) doc.text(line);
  doc.moveDown();

  doc.fontSize(13).text('Resumen');
  doc.fontSize(11).text(`Ingresos: $${report.summary.income.total.toFixed(2)} (${report.summary.income.count})`);
  doc.text(`Gastos: $${report.summary.expenses.total.toFixed(2)} (${report.summary.expenses.count})`);
  doc.text(`Balance: $${report.summary.balance.toFixed(2)}`);
  doc.moveDown();

  doc.fontSize(13).text(`Movimientos (${report.movements.length})`);
  doc.moveDown(0.5);

  if (report.movements.length === 0) {
    doc.fontSize(11).text('No hay movimientos en este período.');
    doc.end();
    return;
  }

  // Tabla simple (texto)
  const colDate = 90;
  const colType = 70;
  const colCat = 120;
  const colAmount = 90;
  const startX = doc.x;

  doc.fontSize(10).text('Fecha', startX, doc.y, { width: colDate });
  doc.text('Tipo', startX + colDate, doc.y, { width: colType });
  doc.text('Categoría', startX + colDate + colType, doc.y, { width: colCat });
  doc.text('Importe', startX + colDate + colType + colCat, doc.y, { width: colAmount, align: 'right' });
  doc.moveDown(0.3);
  doc.moveTo(startX, doc.y).lineTo(startX + colDate + colType + colCat + colAmount, doc.y).stroke();
  doc.moveDown(0.3);

  for (const m of report.movements) {
    const date = (m.date || '').toString().slice(0, 10);
    const type = m.type === 'income' ? 'Ingreso' : 'Gasto';
    const cat = m.category || '-';
    const amount = `${m.type === 'income' ? '+' : '-'}$${parseFloat(m.amount).toFixed(2)}`;

    const yBefore = doc.y;
    doc.fontSize(10).text(date, startX, yBefore, { width: colDate });
    doc.text(type, startX + colDate, yBefore, { width: colType });
    doc.text(cat, startX + colDate + colType, yBefore, { width: colCat });
    doc.text(amount, startX + colDate + colType + colCat, yBefore, { width: colAmount, align: 'right' });
    doc.moveDown(0.6);

    if (doc.y > doc.page.height - 80) {
      doc.addPage();
    }
  }

  doc.end();
};

export const getWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange('weekly');

    const report = await buildReport(userId, { startDate, endDate });

    res.json({
      period: 'weekly',
      ...report
    });
  } catch (error) {
    console.error('Error al generar informe semanal:', error);
    res.status(500).json({ error: 'Error al generar informe semanal' });
  }
};

export const getMonthlyReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange('monthly');

    const report = await buildReport(userId, { startDate, endDate });

    res.json({
      period: 'monthly',
      ...report
    });
  } catch (error) {
    console.error('Error al generar informe mensual:', error);
    res.status(500).json({ error: 'Error al generar informe mensual' });
  }
};

export const getWeeklyReportPdf = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange('weekly');
    const user = await User.findById(userId);
    const report = await buildReport(userId, { startDate, endDate });

    writeReportPdfToResponse({
      res,
      title: 'Money Tracker - Informe semanal',
      filename: `reporte_semanal_${startDate}_a_${endDate}.pdf`,
      user,
      report,
      subtitleLines: [`Rango: ${startDate} a ${endDate}`]
    });
  } catch (error) {
    console.error('Error al generar PDF del informe semanal:', error);
    res.status(500).json({ error: 'Error al generar PDF del informe semanal' });
  }
};

export const getMonthlyReportPdf = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange('monthly');
    const user = await User.findById(userId);
    const report = await buildReport(userId, { startDate, endDate });

    writeReportPdfToResponse({
      res,
      title: 'Money Tracker - Informe mensual',
      filename: `reporte_mensual_${startDate}_a_${endDate}.pdf`,
      user,
      report,
      subtitleLines: [`Rango: ${startDate} a ${endDate}`]
    });
  } catch (error) {
    console.error('Error al generar PDF del informe mensual:', error);
    res.status(500).json({ error: 'Error al generar PDF del informe mensual' });
  }
};

export const getRangeReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!isValidISODateOnly(startDate) || !isValidISODateOnly(endDate)) {
      return res.status(400).json({ error: 'startDate y endDate deben tener formato YYYY-MM-DD' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate no puede ser mayor que endDate' });
    }

    const report = await buildReport(userId, { startDate, endDate });
    res.json({
      period: 'range',
      ...report
    });
  } catch (error) {
    console.error('Error al generar informe por rango:', error);
    res.status(500).json({ error: 'Error al generar informe por rango' });
  }
};

export const getRangeReportPdf = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = req.query;

    if (!isValidISODateOnly(startDate) || !isValidISODateOnly(endDate)) {
      return res.status(400).json({ error: 'startDate y endDate deben tener formato YYYY-MM-DD' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ error: 'startDate no puede ser mayor que endDate' });
    }

    const user = await User.findById(userId);
    const report = await buildReport(userId, { startDate, endDate });

    writeReportPdfToResponse({
      res,
      title: 'Money Tracker - Informe por rango',
      filename: `reporte_${startDate}_a_${endDate}.pdf`,
      user,
      report,
      subtitleLines: [`Rango: ${startDate} a ${endDate}`]
    });
  } catch (error) {
    console.error('Error al generar PDF del informe por rango:', error);
    res.status(500).json({ error: 'Error al generar PDF del informe por rango' });
  }
};

export const generateReportForEmail = async (userId, period) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const { startDate, endDate } = getDateRange(period);
  const report = await buildReport(userId, { startDate, endDate });

  return {
    user,
    period,
    ...report
  };
};
