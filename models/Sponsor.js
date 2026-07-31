const pool = require('../config/database');

class Sponsor {
    static async create(data) {
        const {
            userId, name, organization, email, phone, contactPerson,
            sponsorshipType, amount, registrationDate, address, notes, status
        } = data;

        const sql = `
            INSERT INTO sponsors (
                user_id, name, organization, email, phone, contact_person,
                sponsorship_type, amount, registration_date, address, notes, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const values = [
            userId || null,
            name,
            organization || '',
            email,
            phone,
            contactPerson,
            sponsorshipType || 'Standard',
            amount || 0,
            registrationDate || new Date(),
            address || '',
            notes || '',
            status || 'Pending'
        ];

        const result = await pool.query(sql, values);
        return result.rows[0];
    }

    static async getAll() {
        const sql = `
            SELECT * FROM sponsors
            ORDER BY name ASC
        `;
        const result = await pool.query(sql);
        return result.rows;
    }

    static async findById(id) {
        const sql = `
            SELECT * FROM sponsors
            WHERE id = $1
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getByName(name) {
        if (!name) return null;
        const result = await pool.query('SELECT * FROM sponsors WHERE LOWER(name) = LOWER($1)', [name.trim()]);
        return result.rows[0] || null;
    }

    static async getByEmail(email) {
        if (!email) return null;
        const result = await pool.query('SELECT * FROM sponsors WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        return result.rows[0] || null;
    }

    static async update(id, data) {
        const {
            name, organization, email, phone, contactPerson,
            sponsorshipType, amount, registrationDate, address, notes, status
        } = data;

        const sql = `
            UPDATE sponsors 
            SET
                name = $1, organization = $2, email = $3, phone = $4,
                contact_person = $5, sponsorship_type = $6, amount = $7,
                registration_date = $8, address = $9, notes = $10, status = $11
            WHERE id = $12
            RETURNING *
        `;
        const values = [
            name, organization || '', email, phone, contactPerson,
            sponsorshipType || 'Standard', amount || 0, registrationDate || new Date(), address || '', notes || '', status,
            id
        ];

        const result = await pool.query(sql, values);
        return result.rows[0] || null;
    }

    static async approve(id) {
        const sql = `
            UPDATE sponsors
            SET status = 'Active'
            WHERE id = $1
            RETURNING *
        `;
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async delete(id) {
        const sql = 'DELETE FROM sponsors WHERE id = $1 RETURNING id';
        const result = await pool.query(sql, [id]);
        return result.rows[0] || null;
    }

    static async getStats() {
        const totalSql = 'SELECT COUNT(*) FROM sponsors';
        const fundingSql = 'SELECT SUM(amount) as total_funding FROM sponsors';
        const tiersSql = `
            SELECT sponsorship_type, COUNT(*)
            FROM sponsors
            GROUP BY sponsorship_type
        `;

        const [total, funding, tiers] = await Promise.all([
            pool.query(totalSql),
            pool.query(fundingSql),
            pool.query(tiersSql)
        ]);

        return {
            totalSponsors: parseInt(total.rows[0].count),
            totalFunding: parseFloat(funding.rows[0].total_funding || 0),
            tierDistribution: tiers.rows
        };
    }
}

module.exports = Sponsor;
