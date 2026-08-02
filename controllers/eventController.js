const Event = require('../models/Event');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const { sendEventNotificationEmail } = require('../utils/notifier');

const getAllEvents = async (req, res, next) => {
    try {
        const { status } = req.query;
        const events = await Event.find(status ? { status } : {}).sort({ eventDate: 1 });
        return successResponse(res, events);
    } catch (err) {
        next(err);
    }
};

const createEvent = async (req, res, next) => {
    try {
        const { date, time, eventDate, eventTime, targetedParticipants, internalParticipants, externalParticipants } = req.body;

        // Map frontend 'date'/'time' to schema 'eventDate'/'eventTime'
        const eventData = { ...req.body };
        if (date && !eventDate) eventData.eventDate = date;
        if (time && !eventTime) eventData.eventTime = time;

        const event = new Event(eventData);
        await event.save();

        await NotificationService.notifyAll(`📅 New Event: "${event.title}" created.`, 'success');

        // Sending notifications
        try {
            const emailPromises = [];

            // 1. Internal Participants (Explicitly selected)
            if (internalParticipants && internalParticipants.length > 0) {
                const selectedUsers = await User.find({ _id: { $in: internalParticipants } });
                selectedUsers.forEach(user => {
                    emailPromises.push(sendEventNotificationEmail({
                        email: user.email,
                        name: user.fullName,
                        event: event
                    }));
                });
            }

            // 2. Targeted Participants (Roles/Groups)
            if (targetedParticipants && targetedParticipants.length > 0) {
                let users;
                if (targetedParticipants.includes('All')) {
                    users = await User.find({ isActive: true });
                } else {
                    const roleIds = await getRoleIdsByNames(targetedParticipants);
                    users = await User.find({ roleId: { $in: roleIds }, isActive: true });
                }

                users.forEach(user => {
                    // Avoid duplicate emails if user was also in internalParticipants
                    if (!internalParticipants || !internalParticipants.includes(user._id.toString())) {
                        emailPromises.push(sendEventNotificationEmail({
                            email: user.email,
                            name: user.fullName,
                            event: event
                        }));
                    }
                });
            }

            // 3. External Participants
            if (externalParticipants && externalParticipants.length > 0) {
                externalParticipants.forEach(ext => {
                    if (ext.email) {
                        emailPromises.push(sendEventNotificationEmail({
                            email: ext.email,
                            name: ext.name || 'Participant',
                            event: event
                        }));
                    }
                });
            }

            // Fire and forget email sending in background
            Promise.allSettled(emailPromises).then(results => {
                const succeeded = results.filter(r => r.status === 'fulfilled').length;
                console.log(`✅ Event notifications: ${succeeded}/${emailPromises.length} emails sent.`);
            });

        } catch (e) {
            console.error('Event Email Notification Error:', e.message);
        }

        return successResponse(res, event, 'Event created successfully.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Helper to resolve role names to IDs
 */
async function getRoleIdsByNames(names) {
    const Role = require('../models/Role');
    const roles = await Role.find({ name: { $in: names } });
    return roles.map(r => r._id);
}

const approveEvent = async (req, res, next) => {
    try {
        const updated = await Event.findByIdAndUpdate(req.params.id, { status: 'Active' }, { new: true });
        if (!updated) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`✅ Event approved: "${updated.title}"`, 'success');
        return successResponse(res, updated);
    } catch (err) {
        next(err);
    }
};

const updateEvent = async (req, res, next) => {
    try {
        const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`📝 Event updated: "${updated.title}"`, 'info');
        return successResponse(res, updated);
    } catch (err) {
        next(err);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        const deleted = await Event.findByIdAndDelete(req.params.id);
        if (!deleted) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`🗑️ An event was deleted.`, 'warning');
        return successResponse(res, { id: req.params.id });
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
