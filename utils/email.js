/**
 * Email Utility (Simulated)
 */

/**
 * Send an email (mocked).
 * @param {string} to - Recipient email
 * @param {string} subject - Subject line
 * @param {string} text - Plain text body
 * @returns {Promise<boolean>} Success status
 */
const sendEmail = async (to, subject, text) => {
    console.log(`[EMAIL SENDING SIMULATION] to: ${to} | subject: ${subject}`);
    console.log(`[BODY]: ${text}`);
    return true;
};

module.exports = {
    sendEmail
};
