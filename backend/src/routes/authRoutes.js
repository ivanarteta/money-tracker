import express from 'express';
import { body } from 'express-validator';
import { register, login, getProfile, updateProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('name').notEmpty().withMessage('El nombre es requerido'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Divisa inválida')
  ],
  handleValidationErrors,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es requerida')
  ],
  handleValidationErrors,
  login
);

router.get('/profile', authenticateToken, getProfile);
router.put(
  '/profile',
  authenticateToken,
  [
    body('email').optional().isEmail().withMessage('Email inválido'),
    body('name').optional().notEmpty().withMessage('El nombre no puede estar vacío'),
    body('password').optional().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Divisa inválida')
  ],
  handleValidationErrors,
  updateProfile
);

export default router;
