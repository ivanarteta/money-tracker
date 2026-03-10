import { Movement } from '../models/Movement.js';

const isValidAttachmentForUser = (objectName, userId) => {
  if (!objectName || typeof objectName !== 'string') return true;
  const prefix = `${userId}/`;
  return objectName.startsWith(prefix) && !objectName.includes('..');
};

export const createMovement = async (req, res) => {
  try {
    const { type, amount, category, description, date, attachmentObjectName } = req.body;
    const userId = req.user.userId;

    if (!['expense', 'income'].includes(type)) {
      return res.status(400).json({ error: 'Tipo debe ser "expense" o "income"' });
    }
    if (attachmentObjectName && !isValidAttachmentForUser(attachmentObjectName, userId)) {
      return res.status(400).json({ error: 'El archivo adjunto no es válido' });
    }

    const movement = await Movement.create(userId, type, amount, category, description, date, attachmentObjectName || null);
    res.status(201).json(movement);
  } catch (error) {
    console.error('Error al crear movimiento:', error);
    res.status(500).json({ error: 'Error al crear movimiento' });
  }
};

export const getMovements = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type, startDate, endDate } = req.query;

    const filters = {};
    if (type) filters.type = type;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const movements = await Movement.findAllByUserId(userId, filters);
    res.json(movements);
  } catch (error) {
    console.error('Error al obtener movimientos:', error);
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
};

export const getMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const movement = await Movement.findById(id, userId);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json(movement);
  } catch (error) {
    console.error('Error al obtener movimiento:', error);
    res.status(500).json({ error: 'Error al obtener movimiento' });
  }
};

export const updateMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    if (updates.type && !['expense', 'income'].includes(updates.type)) {
      return res.status(400).json({ error: 'Tipo debe ser "expense" o "income"' });
    }
    if (updates.attachmentObjectName !== undefined && !isValidAttachmentForUser(updates.attachmentObjectName, userId)) {
      return res.status(400).json({ error: 'El archivo adjunto no es válido' });
    }

    const movement = await Movement.update(id, userId, updates);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json(movement);
  } catch (error) {
    console.error('Error al actualizar movimiento:', error);
    res.status(500).json({ error: 'Error al actualizar movimiento' });
  }
};

export const deleteMovement = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const movement = await Movement.delete(id, userId);
    if (!movement) {
      return res.status(404).json({ error: 'Movimiento no encontrado' });
    }

    res.json({ message: 'Movimiento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar movimiento:', error);
    res.status(500).json({ error: 'Error al eliminar movimiento' });
  }
};
