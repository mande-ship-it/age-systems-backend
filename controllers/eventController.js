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
        const { attendees, targetedParticipants, ...rest } = req.body;
        const eventData = { ...rest };

        // Map frontend fields to model fields if necessary
        if (req.body.date && !eventData.eventDate) eventData.eventDate = req.body.date;
        if (req.body.time && !eventData.eventTime) eventData.eventTime = req.body.time;

        if (attendees) eventData.attendees = attendees;
        if (targetedParticipants) eventData.targetedParticipants = targetedParticipants;

        const event = new Event(eventData);
        await event.save();

        // Send Email Notifications in parallel (background)
        if (attendees && attendees.length > 0) {
            const emailPromises = attendees.map(async (attendee) => {
                try {
                    let participant;
                    if (attendee.participantType === 'Scholar') {
                        participant = await Scholar.findById(attendee.participantId);
                    } else {
                        participant = await User.findById(attendee.participantId);
                    }

                    if (participant && participant.email) {
                        return sendEventNotificationEmail({
                            email: participant.email,
                            name: participant.fullName || participant.full_name,
                            event: event
                        });
                    }
                } catch (err) {
                    console.error(`Error processing attendee ${attendee.participantId}:`, err.message);
                }
            });

            // Don't await individual emails inside the request cycle to keep UI fast
            Promise.allSettled(emailPromises).then(results => {
                const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
                console.log(`✅ Event Invitations: ${successful}/${attendees.length} emails dispatched.`);
            });
        }

        await NotificationService.notifyAll(`📅 New Event: "${event.title}" scheduled for ${new Date(event.eventDate).toDateString()}`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, event, 'Event created and invitations are being dispatched.', 201);
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
