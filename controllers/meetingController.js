const Meeting = require('../models/Meeting');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const { sendMeetingNotificationEmail } = require('../utils/notifier');
const NotificationService = require('../utils/notificationService');

/**
 * Create a new meeting
 */
const createMeeting = async (req, res, next) => {
    try {
        const { title, description, participants, meetingDate, meetingTime } = req.body;

        // Generate a mock Google Meet link
        // In a real app, you'd use Google Calendar API to create an event and get the link
        const randomCode = Math.random().toString(36).substring(2, 5) + '-' +
                           Math.random().toString(36).substring(2, 6) + '-' +
                           Math.random().toString(36).substring(2, 5);
        const meetingLink = `https://meet.google.com/${randomCode}`;

        const meeting = new Meeting({
            title,
            description,
            organizer: req.user.id,
            participants,
            meetingDate: meetingDate || Date.now(),
            meetingTime,
            meetingLink,
            status: 'Scheduled'
        });

        await meeting.save();

        // Notify participants via email
        if (participants && participants.length > 0) {
            const users = await User.find({ _id: { $in: participants } });

            for (const user of users) {
                // Send Email
                sendMeetingNotificationEmail({
                    email: user.email,
                    name: user.fullName,
                    meeting
                });

                // Send In-app Notification
                NotificationService.notifyUser(
                    user._id,
                    `You've been invited to a meeting: ${title}`,
                    'info',
                    req.user.fullName
                );
            }
        }

        return successResponse(res, meeting, 'Meeting created and invitations sent successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Get all meetings for a user (as organizer or participant)
 */
const getMyMeetings = async (req, res, next) => {
    try {
        const meetings = await Meeting.find({
            $or: [
                { organizer: req.user.id },
                { participants: req.user.id }
            ]
        }).populate('organizer participants', 'fullName email role_name')
          .sort({ meetingDate: -1 });

        return successResponse(res, meetings);
    } catch (err) {
        next(err);
    }
};

/**
 * Get meeting by ID
 */
const getMeetingById = async (req, res, next) => {
    try {
        const meeting = await Meeting.findById(req.params.id)
            .populate('organizer participants', 'fullName email role_name');

        if (!meeting) return errorResponse(res, 'Meeting not found.', 404);

        return successResponse(res, meeting);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    createMeeting,
    getMyMeetings,
    getMeetingById
};
