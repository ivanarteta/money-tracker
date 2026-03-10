import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { uploadPdf, listFiles, getDownloadUrl, deleteFile } from '../controllers/storageController.js';

const router = Router();

router.use(authenticateToken);

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'El archivo es demasiado grande (máx. 10 MB)' : err.message });
  }
  if (err.message?.includes('Solo se permiten')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

router.get('/', listFiles);
router.get('/download/:objectName', getDownloadUrl);
router.delete('/:objectName', deleteFile);
router.post('/upload', uploadPdf, handleUploadError);

export default router;
