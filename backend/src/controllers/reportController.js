import { Movement } from '../models/Movement.js';
import { User } from '../models/User.js';
import PDFDocument from 'pdfkit';

const PDF_THEME = {
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

const getPreviousMonthRange = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0=enero
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59, 999);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

const isValidISODateOnly = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const formatMoney = (value, currency = 'EUR', locale = 'es-ES') => {
  const number = typeof value === 'number' ? value : parseFloat(value);
  const safe = Number.isFinite(number) ? number : 0;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(safe);
  } catch {
    return `${safe.toFixed(2)} ${currency}`;
  }
};

const drawSectionTitle = (doc, title) => {
  doc
    .moveDown(0.3)
    .fontSize(12)
    .fillColor(PDF_THEME.text)
    .text(title, { continued: false });
  doc
    .moveDown(0.35)
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .lineWidth(1)
    .strokeColor(PDF_THEME.border)
    .stroke();
  doc.moveDown(0.6);
};

const drawSummaryCards = ({ doc, report, currency }) => {
  const x = doc.page.margins.left;
  const y = doc.y;
  const gap = 12;
  const totalWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const cardW = (totalWidth - gap * 2) / 3;
  const cardH = 64;

  const cards = [
    { title: 'Ingresos', value: formatMoney(report.summary.income.total, currency), count: `${report.summary.income.count} movimientos`, accent: PDF_THEME.income },
    { title: 'Gastos', value: formatMoney(report.summary.expenses.total, currency), count: `${report.summary.expenses.count} movimientos`, accent: PDF_THEME.expense },
    { title: 'Balance', value: formatMoney(report.summary.balance, currency), count: report.summary.balance >= 0 ? 'Superávit' : 'Déficit', accent: report.summary.balance >= 0 ? PDF_THEME.primary : PDF_THEME.expense }
  ];

  for (let i = 0; i < cards.length; i++) {
    const cx = x + i * (cardW + gap);
    const c = cards[i];

    doc
      .roundedRect(cx, y, cardW, cardH, 10)
      .fillColor(PDF_THEME.surface)
      .fill()
      .lineWidth(1)
      .strokeColor(PDF_THEME.border)
      .stroke();

    doc.rect(cx, y, 4, cardH).fillColor(c.accent).fill();

    doc
      .fillColor(PDF_THEME.muted)
      .fontSize(9)
      .text(c.title.toUpperCase(), cx + 12, y + 10, { width: cardW - 24 });
    doc
      .fillColor(PDF_THEME.text)
      .fontSize(15)
      .text(c.value, cx + 12, y + 25, { width: cardW - 24 });
    doc
      .fillColor(PDF_THEME.muted)
      .fontSize(9)
      .text(c.count, cx + 12, y + 46, { width: cardW - 24 });
  }

  doc.y = y + cardH + 14;
};

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

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(res);

  const currency = user?.currency || 'EUR';

  // Header
  const headerH = 78;
  doc.rect(0, 0, doc.page.width, headerH).fillColor(PDF_THEME.primary).fill();
  doc
    .fillColor('#ffffff')
    .fontSize(18)
    .text(title, doc.page.margins.left, 22, { align: 'left' });
  doc
    .fillColor('#ffffff')
    .fontSize(10)
    .text(`Usuario: ${user?.name || '-'} (${user?.email || '-'})`, doc.page.margins.left, 46, { align: 'left' });
  doc
    .fillColor('#ffffff')
    .fontSize(9)
    .text(subtitleLines.join(' · '), doc.page.margins.left, 62, { align: 'left' });

  doc.y = headerH + 18;

  drawSectionTitle(doc, 'Resumen');
  drawSummaryCards({ doc, report, currency });

  drawSectionTitle(doc, `Movimientos (${report.movements.length})`);

  if (report.movements.length === 0) {
    doc.fillColor(PDF_THEME.muted).fontSize(11).text('No hay movimientos en este período.');
    doc.end();
    return;
  }

  // Tabla simple (texto)
  const startX = doc.page.margins.left;
  const tableW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const colDate = 85;
  const colType = 70;
  const colCat = 150;
  const colAmount = 110;
  const colDesc = tableW - (colDate + colType + colCat + colAmount);

  // Header row background
  const headerY = doc.y;
  const rowH = 18;
  doc.rect(startX, headerY - 2, tableW, rowH + 6).fillColor(PDF_THEME.primarySoft).fill();

  doc.fillColor(PDF_THEME.text).fontSize(9);
  doc.text('Fecha', startX + 8, headerY, { width: colDate - 8 });
  doc.text('Tipo', startX + colDate + 8, headerY, { width: colType - 8 });
  doc.text('Categoría', startX + colDate + colType + 8, headerY, { width: colCat - 8 });
  doc.text('Descripción', startX + colDate + colType + colCat + 8, headerY, { width: colDesc - 8 });
  doc.text('Importe', startX + colDate + colType + colCat + colDesc, headerY, { width: colAmount, align: 'right' });

  doc
    .moveTo(startX, headerY + rowH + 3)
    .lineTo(startX + tableW, headerY + rowH + 3)
    .lineWidth(1)
    .strokeColor(PDF_THEME.border)
    .stroke();
  doc.y = headerY + rowH + 8;

  let zebra = false;
  for (const m of report.movements) {
    const date = (m.date || '').toString().slice(0, 10);
    const type = m.type === 'income' ? 'Ingreso' : 'Gasto';
    const cat = m.category || '-';
    const desc = (m.description || '-').toString();
    const amountValue = parseFloat(m.amount);
    const amountText = `${m.type === 'income' ? '+' : '-'}${formatMoney(Math.abs(Number.isFinite(amountValue) ? amountValue : 0), currency)}`;

    const y = doc.y;
    const bg = zebra ? '#fbfdff' : '#ffffff';
    zebra = !zebra;
    doc.rect(startX, y - 2, tableW, rowH + 6).fillColor(bg).fill();

    doc.fillColor(PDF_THEME.muted).fontSize(9).text(date, startX + 8, y, { width: colDate - 8 });

    const badgeX = startX + colDate + 8;
    doc
      .roundedRect(badgeX, y - 1, colType - 18, 14, 7)
      .fillColor(m.type === 'income' ? '#e6f7ff' : '#ffecec')
      .fill();
    doc
      .fillColor(m.type === 'income' ? PDF_THEME.income : PDF_THEME.expense)
      .fontSize(8)
      .text(type, badgeX, y + 2, { width: colType - 18, align: 'center' });

    doc.fillColor(PDF_THEME.text).fontSize(9).text(cat, startX + colDate + colType + 8, y, { width: colCat - 8 });
    doc.fillColor(PDF_THEME.muted).fontSize(9).text(desc, startX + colDate + colType + colCat + 8, y, { width: colDesc - 8 });
    doc
      .fillColor(m.type === 'income' ? PDF_THEME.income : PDF_THEME.expense)
      .fontSize(9)
      .text(amountText, startX + colDate + colType + colCat + colDesc, y, { width: colAmount, align: 'right' });

    doc.y = y + rowH + 6;

    if (doc.y > doc.page.height - 80) {
      doc.addPage();
      doc.y = doc.page.margins.top;
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

  // El informe mensual se envía el día 1: debe cubrir el mes anterior completo.
  const { startDate, endDate } = period === 'monthly' ? getPreviousMonthRange() : getDateRange(period);
  const report = await buildReport(userId, { startDate, endDate });

  return {
    user,
    period,
    ...report
  };
};
