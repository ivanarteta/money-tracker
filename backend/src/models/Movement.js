import pool from '../config/database.js';

export class Movement {
  static async create(userId, type, amount, category, description, date) {
    const result = await pool.query(
      `INSERT INTO movements (user_id, type, amount, category, description, date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, type, amount, category, description, date]
    );
    return result.rows[0];
  }

  static async findAllByUserId(userId, filters = {}) {
    let query = 'SELECT * FROM movements WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (filters.type) {
      query += ` AND type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters.startDate) {
      query += ` AND date >= $${paramIndex}`;
      params.push(filters.startDate);
      paramIndex++;
    }

    if (filters.endDate) {
      query += ` AND date <= $${paramIndex}`;
      params.push(filters.endDate);
      paramIndex++;
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findById(id, userId) {
    const result = await pool.query(
      'SELECT * FROM movements WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0];
  }

  static async update(id, userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.type !== undefined) {
      fields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.amount !== undefined) {
      fields.push(`amount = $${paramIndex++}`);
      values.push(updates.amount);
    }
    if (updates.category !== undefined) {
      fields.push(`category = $${paramIndex++}`);
      values.push(updates.category);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.date !== undefined) {
      fields.push(`date = $${paramIndex++}`);
      values.push(updates.date);
    }

    if (fields.length === 0) {
      return await this.findById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE movements SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await pool.query(
      'DELETE FROM movements WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  static async getSummary(userId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
        type,
        SUM(amount) as total,
        COUNT(*) as count
       FROM movements
       WHERE user_id = $1 AND date >= $2 AND date <= $3
       GROUP BY type`,
      [userId, startDate, endDate]
    );
    return result.rows;
  }
}
