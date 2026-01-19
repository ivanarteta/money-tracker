import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './Movements.css';

const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMovements();
  }, [filter]);

  const fetchMovements = async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const response = await api.get('/movements', { params });
      setMovements(response.data);
    } catch (error) {
      console.error('Error al cargar movimientos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMovement) {
        await api.put(`/movements/${editingMovement.id}`, formData);
      } else {
        await api.post('/movements', formData);
      }
      resetForm();
      fetchMovements();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar movimiento');
    }
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    setFormData({
      type: movement.type,
      amount: movement.amount,
      category: movement.category,
      description: movement.description || '',
      date: movement.date
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este movimiento?')) return;
    
    try {
      await api.delete(`/movements/${id}`);
      fetchMovements();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al eliminar movimiento');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingMovement(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="movements-page">
      <div className="page-header">
        <h1>Movimientos</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Nuevo Movimiento'}
        </button>
      </div>

      {showForm && (
        <div className="movement-form-card">
          <h2>{editingMovement ? 'Editar' : 'Nuevo'} Movimiento</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Ingreso</option>
                </select>
              </div>
              <div className="form-group">
                <label>Importe</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>Categoría</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                placeholder="Ej: Comida, Transporte, Salario..."
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                placeholder="Descripción opcional..."
              />
            </div>
            <div className="form-group">
              <label>Fecha</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingMovement ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <button
          className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('all')}
        >
          Todos
        </button>
        <button
          className={filter === 'income' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('income')}
        >
          Ingresos
        </button>
        <button
          className={filter === 'expense' ? 'filter-btn active' : 'filter-btn'}
          onClick={() => setFilter('expense')}
        >
          Gastos
        </button>
      </div>

      <div className="movements-list">
        {movements.length === 0 ? (
          <p className="empty-state">No hay movimientos registrados</p>
        ) : (
          movements.map((movement) => (
            <div key={movement.id} className={`movement-card ${movement.type}`}>
              <div className="movement-header">
                <div className="movement-type-badge">
                  {movement.type === 'income' ? '💰 Ingreso' : '💸 Gasto'}
                </div>
                <div className="movement-amount">
                  {movement.type === 'income' ? '+' : '-'}${parseFloat(movement.amount).toFixed(2)}
                </div>
              </div>
              <div className="movement-body">
                <div className="movement-category">{movement.category}</div>
                {movement.description && (
                  <div className="movement-description">{movement.description}</div>
                )}
                <div className="movement-date">
                  {new Date(movement.date).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
              <div className="movement-actions">
                <button onClick={() => handleEdit(movement)} className="btn-edit">
                  Editar
                </button>
                <button onClick={() => handleDelete(movement.id)} className="btn-delete">
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Movements;
