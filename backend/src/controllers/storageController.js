import multer from 'multer';
import { uploadFile, listUserFiles, getPresignedDownloadUrl, deleteUserFile } from '../services/minioService.js';

const PDF_MIMETYPE = 'application/pdf';
const MAX_SIZE = 200 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== PDF_MIMETYPE) {
      return cb(new Error('Solo se permiten archivos PDF'), false);
    }
    cb(null, true);
  },
});

export const uploadPdf = [
  upload.single('file'),
  (req, res, next) => {
    if (!req.file) {
      const err = new Error('No se envió ningún archivo. Usa el campo "file" con un PDF.');
      err.status = 400;
      return next(err);
    }
    next();
  },
  async (req, res, next) => {
    try {
      if (!req.file) return;
      const userId = req.user.userId;
      const originalName = req.file.originalname || 'documento.pdf';
      const safeName = originalName.endsWith('.pdf') ? originalName : `${originalName}.pdf`;
      const timestamp = Date.now();
      const filename = `${timestamp}-${safeName}`;

      const result = await uploadFile(userId, filename, req.file.buffer, PDF_MIMETYPE);

      res.status(201).json({
        message: 'Archivo subido correctamente',
        path: result.path,
        objectName: result.objectName,
        filename,
      });
    } catch (err) {
      next(err);
    }
  },
];

export const listFiles = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const files = await listUserFiles(userId);
    res.json({ files });
  } catch (err) {
    next(err);
  }
};

export const getDownloadUrl = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { objectName } = req.params;
    if (!objectName) {
      return res.status(400).json({ error: 'objectName requerido' });
    }
    const url = await getPresignedDownloadUrl(decodeURIComponent(objectName), userId);
    res.json({ url });
  } catch (err) {
    if (err.message === 'No autorizado') {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { objectName } = req.params;
    if (!objectName) {
      return res.status(400).json({ error: 'objectName requerido' });
    }
    await deleteUserFile(decodeURIComponent(objectName), userId);
    res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    if (err.message === 'No autorizado') {
      return res.status(403).json({ error: err.message });
    }
    next(err);
  }
};
