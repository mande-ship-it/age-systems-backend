const pool = require('../config/database');

class Setting {
    // 1. Organisation Profile
    static async getOrganisationProfile() {
        const result = await pool.query('SELECT * FROM organisation_profile LIMIT 1');
        return result.rows[0];
    }

    static async updateOrganisationProfile(data) {
        const { name, type, address, phone, email, website } = data;
        const sql = `
            UPDATE organisation_profile
            SET name = $1, type = $2, address = $3, phone = $4, email = $5, website = $6, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await pool.query(sql, [name, type, address, phone, email, website]);
        return result.rows[0];
    }

    // 2. User Settings (Personal Preferences)
    static async getUserSettings(userId) {
        const sql = 'SELECT * FROM user_settings WHERE user_id = $1';
        const result = await pool.query(sql, [userId]);

        if (result.rows.length === 0) {
            // Create default settings if not exists
            const insertSql = 'INSERT INTO user_settings (user_id) VALUES ($1) RETURNING *';
            const newResult = await pool.query(insertSql, [userId]);
            return newResult.rows[0];
        }
        return result.rows[0];
    }

    static async updateUserSettings(userId, data) {
        const { theme, notificationsEnabled, biometricEnabled, language, currency } = data;
        const sql = `
            UPDATE user_settings
            SET theme = $1, notifications_enabled = $2, biometric_enabled = $3, language = $4, currency = $5, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6
            RETURNING *
        `;
        const result = await pool.query(sql, [theme, notificationsEnabled, biometricEnabled, language, currency, userId]);
        return result.rows[0];
    }

    // 3. Backup & Restore
    static async getBackupSettings() {
        const result = await pool.query('SELECT * FROM backup_settings LIMIT 1');
        return result.rows[0];
    }

    static async updateBackupSettings(data) {
        const { autoBackupEnabled, frequency, wifiOnly } = data;
        const sql = `
            UPDATE backup_settings
            SET auto_backup_enabled = $1, frequency = $2, wifi_only = $3, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `;
        const result = await pool.query(sql, [autoBackupEnabled, frequency, wifiOnly]);
        return result.rows[0];
    }

    static async getBackupHistory() {
        const result = await pool.query('SELECT * FROM backups ORDER BY created_at DESC');
        return result.rows;
    }

    static async addBackupEntry(label, filePath, fileSize) {
        const sql = 'INSERT INTO backups (label, file_path, file_size) VALUES ($1, $2, $3) RETURNING *';
        const result = await pool.query(sql, [label, filePath, fileSize]);

        // Update last backup time
        await pool.query('UPDATE backup_settings SET last_backup_at = CURRENT_TIMESTAMP');

        return result.rows[0];
    }
}

module.exports = Setting;
