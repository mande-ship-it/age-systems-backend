const Internship = require('../models/Internship');
const Scholar = require('../models/Scholar');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { sendInternshipAllocationEmail } = require('../utils/notifier');
const NotificationService = require('../utils/notificationService');

const allocateInternship = async (req, res, next) => {
    try {
        const { scholarId, workplaceName, location, supervisor, startDate, endDate, details, email } = req.body;

        if (!scholarId || !workplaceName) {
            return errorResponse(res, 'Scholar and Workplace are required.', 400);
        }

        // 1. Check if scholar already had an internship
        const existing = await Internship.findByScholarId(scholarId);
        if (existing) {
            return errorResponse(res, 'This scholar has already been allocated an internship and cannot be allocated a second time.', 400);
        }

        // 2. Fetch scholar profile to verify email
        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        // 3. Update email if provided and different
        if (email && email !== scholar.email) {
            await User.update(scholar.user_id, { email });
        }

        // 4. Create Internship record
        const internship = await Internship.create({
            scholarId, workplaceName, location, supervisor, startDate, endDate, details
        });

        // 5. Update Scholar status to 'Alumni'
        await Scholar.update(scholarId, { status: 'Alumni' });

        // 6. Send Notification Email
        try {
            await sendInternshipAllocationEmail({
                email: email || scholar.email,
                name: scholar.full_name,
                workplace: workplaceName,
                location,
                supervisor,
                startDate,
                endDate
            });
        } catch (mailErr) {
            console.error('Internship Mail Error:', mailErr.message);
        }

        // 6. System Notification
        await NotificationService.notifyAll(
            `💼 Internship Allocated: ${scholar.full_name} at ${workplaceName}`,
            'success',
            req.user ? req.user.fullName : 'System'
        );

        return successResponse(res, internship, 'Internship allocated successfully and scholar notified.', 201);
    } catch (err) {
        next(err);
    }
};

const getAllInternships = async (req, res, next) => {
    try {
        const internships = await Internship.getAll();
        return successResponse(res, internships, 'Internships retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    allocateInternship,
    getAllInternships
};
