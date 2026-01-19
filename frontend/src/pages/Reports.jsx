import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Reports.css';

const Reports = () => {
  const [period, setPeriod] = useState('monthly');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [period]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const endpoint = period === 'weekly' ? '/reports/weekly' : '/reports/monthly';
      const response = await api.get(endpoint);
      setReport(response.data);
    } catch (error) {
      console.error('Error al cargar informe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando informe...</div>;
  }

  if (!report) {
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
        </div>
      </div>

      <div className="report-header">
        <h2>
          Informe {period === 'weekly' ? 'Semanal' : 'Mensual'}
        </h2>
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

      <div className="report-summary">
        <div className="summary-card income">
          <h3>Ingresos</h3>
          <p className="amount">${report.summary.income.total.toFixed(2)}</p>
          <span className="count">{report.summary.income.count} movimientos</span>
        </div>
        <div className="summary-card expense">
          <h3>Gastos</h3>
          <p className="amount">${report.summary.expenses.total.toFixed(2)}</p>
          <span className="count">{report.summary.expenses.count} movimientos</span>
        </div>
        <div className={`summary-card balance ${report.summary.balance >= 0 ? 'positive' : 'negative'}`}>
          <h3>Balance</h3>
          <p className="amount">${report.summary.balance.toFixed(2)}</p>
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
                    {movement.type === 'income' ? '💰 Ingreso' : '💸 Gasto'}
                  </span>
                </div>
                <div>{movement.category}</div>
                <div className="description-col">
                  {movement.description || '-'}
                </div>
                <div className={`amount-col ${movement.type}`}>
                  {movement.type === 'income' ? '+' : '-'}${parseFloat(movement.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
