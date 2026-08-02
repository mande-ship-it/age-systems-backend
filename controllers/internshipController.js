const Internship = require('../models/Internship');
const Scholar = require('../models/Scholar');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { sendInternshipAllocationEmail } = require('../utils/notifier');
const NotificationService = require('../utils/notificationService');

const allocateInternship = async (req, res, next) => {
    try {
        const { scholarId, workplaceName, location, supervisor, startDate, endDate, details, email } = req.body;

        const existing = await Internship.findOne({ scholarId });
        if (existing) return errorResponse(res, 'Scholar already allocated.', 400);

        const scholar = await Scholar.findById(scholarId);
        if (!scholar) return errorResponse(res, 'Scholar not found.', 404);

        const internship = new Internship({
            scholarId, workplaceName, location, supervisor, startDate, endDate, details
        });
        await internship.save();

        scholar.status = 'Alumni';
        await scholar.save();

        // Email logic...
        try {
            await sendInternshipAllocationEmail({
                email: email || scholar.email,
                name: scholar.fullName,
                workplace: workplaceName,
                location,
                supervisor,
                startDate,
                endDate
            });
        } catch (e) {}

        await NotificationService.notifyAll(`💼 Internship Allocated: ${scholar.fullName}`, 'success');

        return successResponse(res, internship, 'Internship allocated.', 201);
    } catch (err) {
        next(err);
    }
};

const getAllInternships = async (req, res, next) => {
    try {
        const internships = await Internship.find().populate('scholarId');
        return successResponse(res, internships);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    allocateInternship,
    getAllInternships
};
