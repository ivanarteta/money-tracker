import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [recentMovements, setRecentMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [movementsRes, monthlyRes] = await Promise.all([
        api.get('/movements?limit=5'),
        api.get('/reports/monthly')
      ]);

      setRecentMovements(movementsRes.data.slice(0, 5));
      setSummary(monthlyRes.data.summary);
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
            <p className="amount">${summary.income.total.toFixed(2)}</p>
            <span className="count">{summary.income.count} movimientos</span>
          </div>
          <div className="summary-card expense">
            <h3>Gastos</h3>
            <p className="amount">${summary.expenses.total.toFixed(2)}</p>
            <span className="count">{summary.expenses.count} movimientos</span>
          </div>
          <div className={`summary-card balance ${summary.balance >= 0 ? 'positive' : 'negative'}`}>
            <h3>Balance</h3>
            <p className="amount">${summary.balance.toFixed(2)}</p>
            <span className="count">Este mes</span>
          </div>
        </div>
      )}

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

export default Dashboard;
