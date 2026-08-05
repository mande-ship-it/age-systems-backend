/**
 * District-based Data Partitioning Utility
 */

/**
 * Returns a filter object for MongoDB queries based on user role and assigned district.
 * If user is a Field Officer, it restricts the query to their assigned district.
 * @param {Object} req - The Express request object (expects req.user)
 * @param {Object} baseFilter - Initial filter criteria (optional)
 * @returns {Object} - Merged filter object
 */
const applyDistrictFilter = (req, baseFilter = {}) => {
    const filter = { ...baseFilter };

    if (!req.user) return filter;

    const role = (req.user.role || '').toLowerCase();
    const isFieldOfficer = role.includes('field');
    const assignedDistrict = req.user.assignedDistrict;

    if (isFieldOfficer && assignedDistrict) {
        filter.district = assignedDistrict;
    }

    return filter;
};

module.exports = { applyDistrictFilter };
