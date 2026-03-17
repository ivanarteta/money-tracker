import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addType, setAddType] = useState('expense'); // 'income' | 'expense'
  const [saving, setSaving] = useState(false);
  const [userFiles, setUserFiles] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef(null);
  const [addForm, setAddForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    attachmentObjectName: ''
  });

  const addTitle = useMemo(() => (addType === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'), [addType]);

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

  const fetchUserFiles = async () => {
    try {
      const res = await api.get('/storage');
      setUserFiles(res.data.files || []);
    } catch {
      setUserFiles([]);
    }
  };

  const openAddModal = (type) => {
    setAddType(type);
    setAddForm({
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      attachmentObjectName: ''
    });
    fetchUserFiles();
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (saving) return;
    setAddModalOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (!addModalOpen) return;
      if (e.key === 'Escape') closeAddModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [addModalOpen, saving]);

  const handleCreateMovement = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        type: addType,
        amount: addForm.amount,
        category: addForm.category,
        description: addForm.description || undefined,
        date: addForm.date,
        attachmentObjectName: addForm.attachmentObjectName || null
      };
      await api.post('/movements', payload);
      setAddModalOpen(false);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar movimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadNewAttachment = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      if (file) alert('Solo se permiten archivos PDF.');
      e.target.value = '';
      return;
    }
    setUploadingAttachment(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${getBaseUrl()}/storage/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formDataUpload,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al subir');
      }
      const data = await res.json();
      setAddForm((prev) => ({ ...prev, attachmentObjectName: data.objectName }));
      setUserFiles((prev) => [...prev, { name: data.objectName, filename: data.filename }]);
    } catch (err) {
      alert(err.message || 'Error al subir el archivo');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <h1>Resumen</h1>
      
      {summary && (
        <div className="summary-cards">
          <div className="summary-card income">
            <div className="summary-card-header">
              <h3>Ingresos</h3>
              <button type="button" className="summary-add-btn" onClick={() => openAddModal('income')} aria-label="Añadir ingreso">
                +
              </button>
            </div>
            <p className="amount">{formatMoney(summary.income.total, user?.currency)}</p>
            <span className="count">{summary.income.count} movimientos</span>
          </div>
          <div className="summary-card expense">
            <div className="summary-card-header">
              <h3>Gastos</h3>
              <button type="button" className="summary-add-btn" onClick={() => openAddModal('expense')} aria-label="Añadir gasto">
                +
              </button>
            </div>
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

      {addModalOpen && (
        <div
          className="dashboard-modal-overlay"
          role="presentation"
          aria-hidden="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div className="dashboard-modal" role="dialog" aria-modal="true" aria-label={addTitle}>
            <div className="dashboard-modal-header">
              <div>
                <div className="dashboard-modal-title">{addTitle}</div>
                <div className="dashboard-modal-subtitle">Tipo fijo: {addType === 'income' ? 'Ingreso' : 'Gasto'}</div>
              </div>
              <button type="button" className="dashboard-modal-close" onClick={closeAddModal} aria-label="Cerrar" disabled={saving}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateMovement} className="dashboard-modal-form">
              <div className="dashboard-form-row">
                <div className="dashboard-form-group">
                  <label>Importe</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={addForm.amount}
                    onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
                <div className="dashboard-form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm((f) => ({ ...f, date: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="dashboard-form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  value={addForm.category}
                  onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                  required
                  placeholder="Ej: Comida, Transporte, Salario..."
                />
              </div>

              <div className="dashboard-form-group">
                <label>Descripción</label>
                <textarea
                  rows="3"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Opcional..."
                />
              </div>

              <div className="dashboard-form-group">
                <label>Archivo adjunto (opcional)</label>
                <select
                  value={addForm.attachmentObjectName}
                  onChange={(e) => setAddForm((f) => ({ ...f, attachmentObjectName: e.target.value }))}
                >
                  <option value="">Ninguno</option>
                  {userFiles.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.filename}
                    </option>
                  ))}
                </select>
                <div className="dashboard-attachment-upload">
                  <input
                    ref={attachmentInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleUploadNewAttachment}
                    disabled={uploadingAttachment || saving}
                    className="dashboard-hidden-file-input"
                  />
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => attachmentInputRef.current?.click()}
                    disabled={uploadingAttachment || saving}
                  >
                    {uploadingAttachment ? 'Subiendo...' : 'Subir PDF nuevo y asociar'}
                  </button>
                </div>
                {(userFiles.length === 0 && !addForm.attachmentObjectName) && (
                  <span className="dashboard-form-hint">Elige uno de la lista o sube un PDF nuevo.</span>
                )}
              </div>

              <div className="dashboard-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeAddModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
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
