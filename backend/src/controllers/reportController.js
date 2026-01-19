import { Movement } from '../models/Movement.js';
import { User } from '../models/User.js';

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

export const getWeeklyReport = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { startDate, endDate } = getDateRange('weekly');

    const movements = await Movement.findAllByUserId(userId, { startDate, endDate });
    const summary = await Movement.getSummary(userId, startDate, endDate);

    const expenses = summary.find(s => s.type === 'expense') || { total: '0', count: '0' };
    const income = summary.find(s => s.type === 'income') || { total: '0', count: '0' };
    const balance = parseFloat(income.total) - parseFloat(expenses.total);

    res.json({
      period: 'weekly',
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

    const movements = await Movement.findAllByUserId(userId, { startDate, endDate });
    const summary = await Movement.getSummary(userId, startDate, endDate);

    const expenses = summary.find(s => s.type === 'expense') || { total: '0', count: '0' };
    const income = summary.find(s => s.type === 'income') || { total: '0', count: '0' };
    const balance = parseFloat(income.total) - parseFloat(expenses.total);

    res.json({
      period: 'monthly',
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
    });
  } catch (error) {
    console.error('Error al generar informe mensual:', error);
    res.status(500).json({ error: 'Error al generar informe mensual' });
  }
};

export const generateReportForEmail = async (userId, period) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const { startDate, endDate } = getDateRange(period);
  const movements = await Movement.findAllByUserId(userId, { startDate, endDate });
  const summary = await Movement.getSummary(userId, startDate, endDate);

  const expenses = summary.find(s => s.type === 'expense') || { total: '0', count: '0' };
  const income = summary.find(s => s.type === 'income') || { total: '0', count: '0' };
  const balance = parseFloat(income.total) - parseFloat(expenses.total);

  return {
    user,
    period,
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
