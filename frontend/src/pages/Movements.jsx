import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { formatMoney } from '../utils/money';
import './Movements.css';

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const Movements = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [userFiles, setUserFiles] = useState([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef(null);
  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    attachmentObjectName: ''
  });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMovements();
  }, [filter]);

  const fetchUserFiles = async () => {
    try {
      const res = await api.get('/storage');
      setUserFiles(res.data.files || []);
    } catch {
      setUserFiles([]);
    }
  };

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
      const payload = {
        type: formData.type,
        amount: formData.amount,
        category: formData.category,
        description: formData.description || undefined,
        date: formData.date,
        attachmentObjectName: formData.attachmentObjectName || null
      };
      if (editingMovement) {
        await api.put(`/movements/${editingMovement.id}`, payload);
      } else {
        await api.post('/movements', payload);
      }
      resetForm();
      fetchMovements();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar movimiento');
    }
  };

  const handleEdit = (movement) => {
    setEditingMovement(movement);
    const dateStr = movement.date ? String(movement.date).slice(0, 10) : new Date().toISOString().split('T')[0];
    setFormData({
      type: movement.type,
      amount: movement.amount,
      category: movement.category,
      description: movement.description || '',
      date: dateStr,
      attachmentObjectName: movement.attachment_object_name || ''
    });
    fetchUserFiles();
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
      date: new Date().toISOString().split('T')[0],
      attachmentObjectName: ''
    });
    setEditingMovement(null);
    setShowForm(false);
  };

  const handleOpenAttachment = async (objectName) => {
    try {
      const res = await api.get(`/storage/download/${encodeURIComponent(objectName)}`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch {
      alert('No se pudo abrir el adjunto');
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
      setFormData((prev) => ({ ...prev, attachmentObjectName: data.objectName }));
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
    <div className="movements-page">
      <div className="page-header">
        <h1>Movimientos</h1>
        <button onClick={() => (showForm ? resetForm() : (fetchUserFiles(), setShowForm(true)))} className="btn-primary">
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
            <div className="form-group">
              <label>Archivo adjunto (opcional)</label>
              <select
                value={formData.attachmentObjectName}
                onChange={(e) => setFormData({ ...formData, attachmentObjectName: e.target.value })}
              >
                <option value="">Ninguno</option>
                {userFiles.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.filename}
                  </option>
                ))}
              </select>
              <div className="attachment-upload">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleUploadNewAttachment}
                  disabled={uploadingAttachment}
                  className="hidden-file-input"
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => attachmentInputRef.current?.click()}
                  disabled={uploadingAttachment}
                >
                  {uploadingAttachment ? 'Subiendo...' : 'Subir PDF nuevo y asociar'}
                </button>
              </div>
              {(userFiles.length === 0 && !formData.attachmentObjectName) && (
                <span className="form-hint">Elige uno de la lista o sube un PDF nuevo arriba.</span>
              )}
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
                  {movement.type === 'income' ? 'Ingreso' : 'Gasto'}
                </div>
                <div className="movement-amount">
                  {movement.type === 'income' ? '+' : '-'}{formatMoney(movement.amount, user?.currency)}
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
                {movement.attachment_object_name && (
                  <button
                    type="button"
                    className="btn-attachment"
                    onClick={() => handleOpenAttachment(movement.attachment_object_name)}
                  >
                    📎 Ver adjunto
                  </button>
                )}
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
