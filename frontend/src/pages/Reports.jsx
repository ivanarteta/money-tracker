import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/money';
import './Reports.css';

const Reports = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly'); // weekly | monthly | range
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (period === 'weekly' || period === 'monthly') {
      fetchReport();
    }
  }, [period]);

  const fetchReport = async (rangeOverride) => {
    setLoading(true);
    try {
      const effectivePeriod = rangeOverride?.period || period;
      const endpoint =
        effectivePeriod === 'weekly'
          ? '/reports/weekly'
          : effectivePeriod === 'monthly'
            ? '/reports/monthly'
            : '/reports/range';

      const params =
        effectivePeriod === 'range'
          ? { startDate: rangeOverride?.startDate ?? startDate, endDate: rangeOverride?.endDate ?? endDate }
          : undefined;

      const response = await api.get(endpoint, { params });
      setReport(response.data);
    } catch (error) {
      console.error('Error al cargar informe:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchRange = async () => {
    if (!startDate || !endDate) return;
    await fetchReport({ period: 'range', startDate, endDate });
  };

  const downloadPdf = async () => {
    try {
      const endpoint =
        period === 'weekly'
          ? '/reports/weekly/pdf'
          : period === 'monthly'
            ? '/reports/monthly/pdf'
            : '/reports/range/pdf';

      const params = period === 'range' ? { startDate, endDate } : undefined;

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download =
        period === 'weekly'
          ? `reporte_semanal_${report?.startDate || ''}_a_${report?.endDate || ''}.pdf`
          : period === 'monthly'
            ? `reporte_mensual_${report?.startDate || ''}_a_${report?.endDate || ''}.pdf`
            : `reporte_${startDate}_a_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error al descargar PDF:', error);
    }
  };

  if (loading) {
    return <div className="loading">Cargando informe...</div>;
  }

  if (!report && period !== 'range') {
    return <div className="loading">No hay datos disponibles</div>;
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>Informes</h1>
        <div className="period-selector">
          <button
            className={period === 'weekly' ? 'period-btn active' : 'period-btn'}
            onClick={() => setPeriod('weekly')}
          >
            Semanal
          </button>
          <button
            className={period === 'monthly' ? 'period-btn active' : 'period-btn'}
            onClick={() => setPeriod('monthly')}
          >
            Mensual
          </button>
          <button
            className={period === 'range' ? 'period-btn active' : 'period-btn'}
            onClick={() => {
              setPeriod('range');
              setReport(null);
            }}
          >
            Por fechas
          </button>
        </div>
      </div>

      {period === 'range' && (
        <div className="range-controls">
          <div className="range-fields">
            <label>
              Desde
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
            <label>
              Hasta
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </label>
            <button className="range-btn" onClick={handleFetchRange} disabled={!startDate || !endDate}>
              Generar
            </button>
          </div>
          {/* el botón de export va en el header del informe para todos los modos */}
        </div>
      )}

      {!report && period === 'range' ? (
        <div className="loading">Selecciona un rango de fechas y pulsa “Generar”</div>
      ) : (
      <div className="report-header">
        <h2>
          Informe {period === 'weekly' ? 'Semanal' : period === 'monthly' ? 'Mensual' : 'por fechas'}
        </h2>
        <div className="report-header-actions">
          <button
            className="range-btn secondary"
            onClick={downloadPdf}
            disabled={period === 'range' ? !startDate || !endDate || !report : !report}
          >
            Exportar PDF
          </button>
        </div>
        <p className="report-dates">
          {new Date(report.startDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })} - {new Date(report.endDate).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
      )}

      {report && (
      <>
      <div className="report-summary">
        <div className="summary-card income">
          <h3>Ingresos</h3>
          <p className="amount">{formatMoney(report.summary.income.total, user?.currency)}</p>
          <span className="count">{report.summary.income.count} movimientos</span>
        </div>
        <div className="summary-card expense">
          <h3>Gastos</h3>
          <p className="amount">{formatMoney(report.summary.expenses.total, user?.currency)}</p>
          <span className="count">{report.summary.expenses.count} movimientos</span>
        </div>
        <div className={`summary-card balance ${report.summary.balance >= 0 ? 'positive' : 'negative'}`}>
          <h3>Balance</h3>
          <p className="amount">{formatMoney(report.summary.balance, user?.currency)}</p>
          <span className="count">
            {report.summary.balance >= 0 ? 'Superávit' : 'Déficit'}
          </span>
        </div>
      </div>

      <div className="report-movements">
        <h3>Movimientos ({report.movements.length})</h3>
        {report.movements.length === 0 ? (
          <p className="empty-state">No hay movimientos en este período</p>
        ) : (
          <div className="movements-table">
            <div className="table-header">
              <div>Fecha</div>
              <div>Tipo</div>
              <div>Categoría</div>
              <div>Descripción</div>
              <div className="amount-col">Importe</div>
            </div>
            {report.movements.map((movement) => (
              <div key={movement.id} className={`table-row ${movement.type}`}>
                <div>
                  {new Date(movement.date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div>
                  <span className="type-badge">
                    {movement.type === 'income' ? 'Ingreso' : 'Gasto'}
                  </span>
                </div>
                <div>{movement.category}</div>
                <div className="description-col">
                  {movement.description || '-'}
                </div>
                <div className={`amount-col ${movement.type}`}>
                  {movement.type === 'income' ? '+' : '-'}{formatMoney(movement.amount, user?.currency)}
                </div>
              </div>
            ))}
          </div>
        )}

        {period === 'range' && (
          <div className="movements-totals">
            <div className="totals-row">
              <span>Ingresos</span>
              <strong className="income">+{formatMoney(report.summary.income.total, user?.currency)}</strong>
            </div>
            <div className="totals-row">
              <span>Gastos</span>
              <strong className="expense">-{formatMoney(report.summary.expenses.total, user?.currency)}</strong>
            </div>
            <div className="totals-row balance">
              <span>Balance</span>
              <strong className={report.summary.balance >= 0 ? 'income' : 'expense'}>
                {formatMoney(report.summary.balance, user?.currency)}
              </strong>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default Reports;
