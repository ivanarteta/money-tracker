import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Settings.css';

const CURRENCIES = ['EUR', 'USD', 'GBP', 'MXN', 'ARS', 'CLP', 'COP', 'PEN'];

const Settings = () => {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', currency: 'EUR', password: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      currency: user.currency || 'EUR',
      password: ''
    });
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        email: form.email,
        currency: form.currency
      };
      if (form.password) payload.password = form.password;

      await updateProfile(payload);
      setMessage('Guardado');
      setForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h1>Ajustes</h1>
        {message && <div className="settings-message">{message}</div>}
        {error && <div className="settings-error">{error}</div>}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Divisa</label>
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Nueva contraseña (opcional)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;

