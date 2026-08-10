const Event = require('../models/Event');
const Scholar = require('../models/Scholar');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const { sendEventNotificationEmail } = require('../utils/notifier');

const getAllEvents = async (req, res, next) => {
    try {
        const { status } = req.query;
        const filter = status ? { status } : {};
        const events = await Event.find(filter)
            .populate('attendees.participantId')
            .sort({ eventDate: 1, eventTime: 1 });
        return successResponse(res, events);
    } catch (err) {
        next(err);
    }
};

const createEvent = async (req, res, next) => {
    try {
        const { attendees, ...rest } = req.body;
        const eventData = { ...rest };

        // Map frontend fields to model fields if necessary
        if (req.body.date && !eventData.eventDate) eventData.eventDate = req.body.date;
        if (req.body.time && !eventData.eventTime) eventData.eventTime = req.body.time;

        if (attendees) {
            eventData.attendees = attendees;
        }

        const event = new Event(eventData);
        await event.save();

        // Send Email Notifications
        if (attendees && attendees.length > 0) {
            for (const attendee of attendees) {
                try {
                    let participant;
                    if (attendee.participantType === 'Scholar') {
                        participant = await Scholar.findById(attendee.participantId);
                    } else {
                        participant = await User.findById(attendee.participantId);
                    }

                    if (participant && participant.email) {
                        await sendEventNotificationEmail({
                            email: participant.email,
                            name: participant.fullName || participant.full_name,
                            event: event
                        });
                    }
                } catch (emailErr) {
                    console.error(`Failed to send event email to ${attendee.participantId}:`, emailErr.message);
                }
            }
        }

        await NotificationService.notifyAll(`📅 New Event: "${event.title}" created and invitations sent.`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, event, 'Event created and invitations synchronized.', 201);
    } catch (err) {
        next(err);
    }
};

const approveEvent = async (req, res, next) => {
    try {
        const updated = await Event.findByIdAndUpdate(req.params.id, { status: 'Active' }, { new: true });
        if (!updated) return errorResponse(res, 'Event not found or already approved.', 404);

        await NotificationService.notifyAll(`✅ Event approved: "${updated.title}"`, 'success', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'Event approved successfully.');
    } catch (err) {
        next(err);
    }
};

const updateEvent = async (req, res, next) => {
    try {
        const eventData = { ...req.body };
        if (req.body.date && !eventData.eventDate) eventData.eventDate = req.body.date;
        if (req.body.time && !eventData.eventTime) eventData.eventTime = req.body.time;

        const updated = await Event.findByIdAndUpdate(req.params.id, eventData, { new: true });
        if (!updated) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`📝 Event updated: "${updated.title}"`, 'info', req.user ? req.user.fullName : 'System');
        return successResponse(res, updated, 'Event updated successfully.');
    } catch (err) {
        next(err);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`🗑️ An event was deleted.`, 'warning', req.user ? req.user.fullName : 'System');
        return successResponse(res, { id: req.params.id }, 'Event deleted successfully.');
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAllEvents,
    createEvent,
    approveEvent,
    updateEvent,
    deleteEvent
};
