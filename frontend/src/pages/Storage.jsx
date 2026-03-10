import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import './Storage.css';

const getBaseUrl = () => import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const formatSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Storage = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [deletingObjectName, setDeletingObjectName] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const fetchFiles = async () => {
    setLoadingList(true);
    try {
      const res = await api.get('/storage');
      setFiles(res.data.files || []);
    } catch (err) {
      setFiles([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setDeletingObjectName(null);
      }
    };
    if (isModalOpen || deletingObjectName) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen, deletingObjectName]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setFile(selected || null);
    setMessage('');
    setError('');
  };

  const openModal = () => {
    setIsModalOpen(true);
    setMessage('');
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsDragActive(false);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const selectFileClick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (!dropped) return;
    setMessage('');
    setError('');
    setFile(dropped);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un archivo PDF.');
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Solo se permiten archivos PDF.');
      return;
    }
    setUploading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${getBaseUrl()}/storage/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Error al subir el archivo.');
      }
      setMessage(`Archivo "${file.name}" subido correctamente.`);
      closeModal();
      fetchFiles();
    } catch (err) {
      setError(err.message || 'Error al subir el archivo.');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (objectName) => {
    try {
      const res = await api.get(`/storage/download/${encodeURIComponent(objectName)}`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al obtener el enlace de descarga.');
    }
  };

  const openDeleteModal = (objectName) => {
    setMessage('');
    setError('');
    setDeletingObjectName(objectName);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeletingObjectName(null);
  };

  const confirmDelete = async () => {
    if (!deletingObjectName) return;
    setDeleting(true);
    setMessage('');
    setError('');
    try {
      await api.delete(`/storage/${encodeURIComponent(deletingObjectName)}`);
      setMessage('Archivo eliminado.');
      setDeletingObjectName(null);
      fetchFiles();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el archivo.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="storage-page">
      <div className="storage-card">
        <h1>Mis archivos</h1>
        <p className="storage-description">
          Sube un PDF y se guardará en tu espacio. Aquí puedes ver y descargar tus archivos.
        </p>
        {message && <div className="storage-message">{message}</div>}
        {error && <div className="storage-error">{error}</div>}

        <div className="storage-actions">
          <button type="button" className="btn-primary" onClick={openModal}>
            Subir archivo
          </button>
        </div>

        <section className="storage-list-section">
          <h2>Listado de archivos</h2>
          {loadingList ? (
            <p className="storage-list-loading">Cargando...</p>
          ) : files.length === 0 ? (
            <p className="storage-list-empty">Aún no tienes archivos. Sube tu primer PDF arriba.</p>
          ) : (
            <ul className="storage-list">
              {files.map((f) => (
                <li key={f.name} className="storage-list-item">
                  <span className="storage-list-name" title={f.filename}>{f.filename}</span>
                  <span className="storage-list-meta">
                    {formatSize(f.size)} · {formatDate(f.lastModified)}
                  </span>
                  <button
                    type="button"
                    className="btn-download"
                    onClick={() => handleDownload(f.name)}
                  >
                    Descargar
                  </button>
                  <button
                    type="button"
                    className="btn-danger btn-icon"
                    onClick={() => openDeleteModal(f.name)}
                    title="Eliminar"
                    aria-label="Eliminar archivo"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Subir archivo PDF" onMouseDown={closeModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subir PDF</h2>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Cerrar">
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="storage-form">
              <input
                ref={inputRef}
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading}
                className="hidden-file-input"
              />

              <div
                className={`dropzone ${isDragActive ? 'active' : ''}`}
                onClick={selectFileClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') selectFileClick();
                }}
              >
                <div className="dropzone-title">Arrastra y suelta tu PDF aquí</div>
                <div className="dropzone-subtitle">o haz clic para seleccionarlo</div>
                {file && <div className="dropzone-file">Seleccionado: <strong>{file.name}</strong></div>}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal} disabled={uploading}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={uploading || !file}>
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingObjectName && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirmar eliminación" onMouseDown={closeDeleteModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar archivo</h2>
              <button type="button" className="modal-close" onClick={closeDeleteModal} aria-label="Cerrar">
                ×
              </button>
            </div>
            <p className="modal-text">
              ¿Seguro que quieres eliminar este archivo? Esta acción no se puede deshacer.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeDeleteModal} disabled={deleting}>
                Cancelar
              </button>
              <button type="button" className="btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Storage;
