const Event = require('../models/Event');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');
const { sendEventNotificationEmail } = require('../utils/notifier');

/**
 * Get all events
 */
const getAllEvents = async (req, res, next) => {
    try {
        const { status } = req.query; // 'Active', 'History', or undefined for default (Active)
        const events = await Event.getAll(status);
        return successResponse(res, events, 'Events retrieved successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new event
 */
const createEvent = async (req, res, next) => {
    try {
        const { title, description, category, date, time, location, organizer, targetedParticipants } = req.body;

        const newEvent = await Event.create({
            title,
            description,
            category,
            eventDate: date,
            eventTime: time,
            location,
            organizer,
            targetedParticipants
        });

        await NotificationService.notifyAll(`📅 New Event: "${title}" created (Pending Approval).`, 'success', req.user ? req.user.fullName : 'System');

        // Send email notifications to all users after creation
        try {
            const users = await User.getAll();
            const emailPromises = users.map(user =>
                sendEventNotificationEmail({
                    email: user.email,
                    name: user.full_name,
                    event: {
                        title: newEvent.title,
                        description: newEvent.description,
                        category: newEvent.category,
                        eventDate: newEvent.date,
                        eventTime: newEvent.time,
                        location: newEvent.location,
                        organizer: newEvent.organizer
                    }
                })
            );
            Promise.allSettled(emailPromises).then(results => {
                const successes = results.filter(r => r.status === 'fulfilled' && r.value).length;
                console.log(`📧 Event creation emails sent: ${successes}/${users.length} successful.`);
            });
        } catch (emailErr) {
            console.error('❌ Error fetching users for event notification:', emailErr.message);
        }

        return successResponse(res, newEvent, 'Event created successfully and is pending approval.', 201);
    } catch (err) {
        next(err);
    }
};

/**
 * Approve an event
 */
const approveEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const event = await Event.findById(id);
        if (!event) return errorResponse(res, 'Event not found.', 404);

        if (event.status === 'Active') {
            return errorResponse(res, 'Event is already approved.', 400);
        }

        const approvedEvent = await Event.approve(id);

        await NotificationService.notifyAll(`✅ Event approved: "${event.title}"`, 'success', req.user ? req.user.fullName : 'System');

        // Send email notifications to all users after approval
        try {
            const users = await User.getAll();
            const emailPromises = users.map(user =>
                sendEventNotificationEmail({
                    email: user.email,
                    name: user.full_name,
                    event: {
                        title: event.title,
                        description: event.description,
                        category: event.category,
                        eventDate: event.date,
                        eventTime: event.time,
                        location: event.location,
                        organizer: event.organizer
                    }
                })
            );
            Promise.allSettled(emailPromises).then(results => {
                const successes = results.filter(r => r.status === 'fulfilled' && r.value).length;
                console.log(`📧 Event approval emails sent: ${successes}/${users.length} successful.`);
            });
        } catch (emailErr) {
            console.error('❌ Error fetching users for event notification:', emailErr.message);
        }

        return successResponse(res, approvedEvent, 'Event approved and notifications sent.');
    } catch (err) {
        next(err);
    }
};

/**
 * Update an existing event
 */
const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description, category, date, time, location, organizer, targetedParticipants } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (category !== undefined) updateData.category = category;
        if (date !== undefined) updateData.eventDate = date;
        if (time !== undefined) updateData.eventTime = time;
        if (location !== undefined) updateData.location = location;
        if (organizer !== undefined) updateData.organizer = organizer;
        if (targetedParticipants !== undefined) updateData.targetedParticipants = targetedParticipants;

        const updatedEvent = await Event.update(id, updateData);
        if (!updatedEvent) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`📝 Event updated: "${updatedEvent.title}"`, 'info', req.user ? req.user.fullName : 'System');

        return successResponse(res, updatedEvent, 'Event updated successfully.');
    } catch (err) {
        next(err);
    }
};

/**
 * Delete an event
 */
const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await Event.delete(id);
        if (!deleted) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`🗑️ An event was deleted.`, 'warning', req.user ? req.user.fullName : 'System');

        return successResponse(res, { id }, 'Event deleted successfully.');
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
