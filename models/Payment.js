const pool = require('../config/database');

class Payment {
    static async create({ scholarId, amount, purpose, paymentDate = new Date(), status = 'Pending' }) {
        const sql = `
            INSERT INTO payments (scholar_id, amount, purpose, payment_date, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [scholarId, amount, purpose, paymentDate, status];
        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll(status = null) {
        let sql = `
            SELECT p.*, s.full_name as scholar_name, s.scholar_id as scholar_id_str
            FROM payments p
            JOIN scholars s ON p.scholar_id = s.id
        `;
        const params = [];
        if (status) {
            sql += ' WHERE p.status = $1';
            params.push(status);
        }
        sql += ' ORDER BY p.created_at DESC';
        const result = await pool.query(sql, params);
        return result.rows;
    }

    static async findById(id) {
        const sql = `
            SELECT p.*, s.full_name as scholar_name, s.scholar_id as scholar_id_str
            FROM payments p
            JOIN scholars s ON p.scholar_id = s.id
            WHERE p.id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async approve(id) {
        const sql = "UPDATE payments SET status = 'Completed' WHERE id = $1 RETURNING *";
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async reject(id) {
        const sql = "UPDATE payments SET status = 'Failed' WHERE id = $1 RETURNING *";
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const sql = 'DELETE FROM payments WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getByScholar(scholarId) {
        const sql = `
            SELECT * FROM payments
            WHERE scholar_id = $1
            ORDER BY payment_date DESC
        `;
        const result = await pool.query(sql, [scholarId]);
        return result.rows;
    }
}

module.exports = Payment;
