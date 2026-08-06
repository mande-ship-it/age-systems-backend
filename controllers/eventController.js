const Event = require('../models/Event');
const { successResponse, errorResponse } = require('../utils/response');
const NotificationService = require('../utils/notificationService');

const getAllEvents = async (req, res, next) => {
    try {
        const { status } = req.query;
        const events = await Event.getAll(status);
        return successResponse(res, events);
    } catch (err) {
        next(err);
    }
};

const createEvent = async (req, res, next) => {
    try {
        const { title, description, category, eventDate, eventTime, location, organizer, targetedParticipants } = req.body;

        const event = await Event.create({
            title,
            description,
            category,
            eventDate,
            eventTime,
            location,
            organizer,
            targetedParticipants
        });

        await NotificationService.notifyAll(`📅 New Event: "${event.title}" created and awaiting approval.`, 'info');

        return successResponse(res, event, 'Event created and awaiting approval.', 201);
    } catch (err) {
        next(err);
    }
};

const approveEvent = async (req, res, next) => {
    try {
        const updated = await Event.approve(req.params.id);
        if (!updated) return errorResponse(res, 'Event not found or already approved.', 404);

        await NotificationService.notifyAll(`✅ Event approved: "${updated.title}"`, 'success');
        return successResponse(res, updated, 'Event approved successfully.');
    } catch (err) {
        next(err);
    }
};

const updateEvent = async (req, res, next) => {
    try {
        const updated = await Event.update(req.params.id, req.body);
        if (!updated) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`📝 Event updated: "${updated.title}"`, 'info');
        return successResponse(res, updated, 'Event updated successfully.');
    } catch (err) {
        next(err);
    }
};

const deleteEvent = async (req, res, next) => {
    try {
        const deleted = await Event.delete(req.params.id);
        if (!deleted) return errorResponse(res, 'Event not found.', 404);

        await NotificationService.notifyAll(`🗑️ An event was deleted.`, 'warning');
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
