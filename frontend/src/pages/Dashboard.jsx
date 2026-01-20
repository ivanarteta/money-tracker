import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/money';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import './Dashboard.css';

const formatISODateLocal = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const parseISODateLocal = (s) => {
  // Espera YYYY-MM-DD y construye fecha en local (no UTC)
  const [y, m, d] = (s || '').split('-').map((x) => parseInt(x, 10));
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
};

const addDays = (d, days) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const buildDailySeries = ({ movements, startDate, endDate }) => {
  const start = parseISODateLocal(startDate);
  const end = parseISODateLocal(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const days = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)) + 1);

  const byDay = new Map(); // YYYY-MM-DD -> { income, expense }
  for (let i = 0; i < days; i++) {
    const day = formatISODateLocal(addDays(start, i));
    byDay.set(day, { income: 0, expense: 0 });
  }

  for (const m of movements) {
    const day = (m.date || '').toString().slice(0, 10);
    if (!byDay.has(day)) continue;
    const amount = parseFloat(m.amount);
    if (!Number.isFinite(amount)) continue;
    const entry = byDay.get(day);
    if (m.type === 'income') entry.income += amount;
    if (m.type === 'expense') entry.expense += amount;
  }

  let balance = 0;
  const series = [];
  for (const [day, v] of byDay.entries()) {
    const net = v.income - v.expense;
    balance += net;
    series.push({
      day,
      income: Number(v.income.toFixed(2)),
      expense: Number(v.expense.toFixed(2)),
      net: Number(net.toFixed(2)),
      balance: Number(balance.toFixed(2))
    });
  }
  return series;
};

const ChartTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) return null;
  const row = payload.reduce((acc, p) => ({ ...acc, [p.dataKey]: p.value }), {});
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">{new Date(label).toLocaleDateString('es-ES')}</div>
      <div className="chart-tooltip-row">
        <span>Ingresos</span>
        <strong>{formatMoney(row.income || 0, currency)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>Gastos</span>
        <strong>{formatMoney(row.expense || 0, currency)}</strong>
      </div>
      <div className="chart-tooltip-row">
        <span>Balance (acum.)</span>
        <strong>{formatMoney(row.balance || 0, currency)}</strong>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [monthSeries, setMonthSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const startDateStr = formatISODateLocal(startDate);
      const endDateStr = formatISODateLocal(endDate);

      const [recentRes, monthlyRes, last30Res] = await Promise.all([
        api.get('/movements?limit=5'),
        api.get('/reports/monthly'),
        api.get('/movements', { params: { startDate: startDateStr, endDate: endDateStr } })
      ]);

      setRecentMovements(recentRes.data.slice(0, 5));
      setSummary(monthlyRes.data.summary);
      setMonthSeries(
        buildDailySeries({
          movements: last30Res.data || [],
          startDate: startDateStr,
          endDate: endDateStr
        })
      );
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard</h1>
      
      {summary && (
        <div className="summary-cards">
          <div className="summary-card income">
            <h3>Ingresos</h3>
            <p className="amount">{formatMoney(summary.income.total, user?.currency)}</p>
            <span className="count">{summary.income.count} movimientos</span>
          </div>
          <div className="summary-card expense">
            <h3>Gastos</h3>
            <p className="amount">{formatMoney(summary.expenses.total, user?.currency)}</p>
            <span className="count">{summary.expenses.count} movimientos</span>
          </div>
          <div className={`summary-card balance ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
            <h3>Balance</h3>
            <p className="amount">{formatMoney(summary.balance, user?.currency)}</p>
            <span className="count">Este mes</span>
          </div>
        </div>
      )}

      <div className="chart-card">
        <div className="chart-header">
          <h2>Mes en curso</h2>
          <span className="chart-subtitle">Ingresos, gastos y balance acumulado (día a día)</span>
        </div>
        {monthSeries.length === 0 ? (
          <p className="empty-state">No hay movimientos este mes</p>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthSeries} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                  stroke="var(--color-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  stroke="var(--color-muted)"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => {
                    const n = Number(v);
                    if (!Number.isFinite(n)) return v;
                    return new Intl.NumberFormat('es-ES', { notation: 'compact' }).format(n);
                  }}
                />
                <Tooltip content={({ active, payload, label }) => (
                  <ChartTooltip active={active} payload={payload} label={label} currency={user?.currency} />
                )} />
                <Legend />
                <Bar dataKey="income" name="Ingresos" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Balance (acum.)"
                  stroke="var(--color-primary)"
                  fill="var(--color-primary-soft)"
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="recent-movements">
        <h2>Movimientos Recientes</h2>
        {recentMovements.length === 0 ? (
          <p className="empty-state">No hay movimientos registrados</p>
        ) : (
          <div className="movements-list">
            {recentMovements.map((movement) => (
              <div key={movement.id} className={`movement-item ${movement.type}`}>
                <div className="movement-info">
                  <span className="category">{movement.category}</span>
                  <span className="description">{movement.description || 'Sin descripción'}</span>
                  <span className="date">{new Date(movement.date).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="movement-amount">
                  {movement.type === 'income' ? '+' : '-'}{formatMoney(movement.amount, user?.currency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
