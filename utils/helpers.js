const bcrypt = require('bcrypt');

/**
 * Hash a plain text password.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare plain text password with hashed password.
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

/**
 * Get attendance metadata from a date
 * @param {Date|string} dateInput
 * @param {string} schoolLevel - 'Secondary' or 'University'
 */
const getAttendanceMetadata = (dateInput, schoolLevel) => {
    const date = new Date(dateInput);
    const day = date.getDate();
    const month = date.getMonth() + 1; // 1-12
    const weekNumber = Math.ceil(day / 7);

    let term = null;
    let semester = null;

    if (schoolLevel === 'Secondary') {
        // Typical Malawi Secondary School Calendar (Approximate)
        // Term 1: Sept - Dec
        // Term 2: Jan - April
        // Term 3: May - July
        if (month >= 9 || month <= 12) term = 'Term 1';
        else if (month >= 1 && month <= 4) term = 'Term 2';
        else term = 'Term 3';
    } else if (schoolLevel === 'University') {
        // Typical University Calendar
        // Sem 1: Aug - Jan
        // Sem 2: Feb - July
        if (month >= 8 || month <= 1) semester = 'Semester 1';
        else semester = 'Semester 2';
    }

    return { month, weekNumber, term, semester };
};

module.exports = {
    hashPassword,
    comparePassword,
    getAttendanceMetadata
};
