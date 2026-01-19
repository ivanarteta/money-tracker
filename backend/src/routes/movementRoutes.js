import express from 'express';
import { body } from 'express-validator';
import {
  createMovement,
  getMovements,
  getMovement,
  updateMovement,
  deleteMovement
} from '../controllers/movementController.js';
import { authenticateToken } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.post(
  '/',
  [
    body('type').isIn(['expense', 'income']).withMessage('Tipo debe ser "expense" o "income"'),
    body('amount').isFloat({ min: 0.01 }).withMessage('El importe debe ser mayor a 0'),
    body('category').notEmpty().withMessage('La categoría es requerida'),
    body('date').isISO8601().withMessage('Fecha inválida')
  ],
  handleValidationErrors,
  createMovement
);

router.get('/', getMovements);
router.get('/:id', getMovement);
router.put('/:id', updateMovement);
router.delete('/:id', deleteMovement);

export default router;
