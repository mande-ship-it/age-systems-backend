const Notification = require('../models/Notification');

/**
 * Utility to create and broadcast notifications
 */
class NotificationService {
    /**
     * Notify a specific user
     */
    static async notifyUser(userId, message, type = 'info', actorName = 'System') {
        try {
            const notification = await Notification.create({ userId, message, type, actorName });

            if (global.io) {
                global.io.to(`user_${userId}`).emit('notification', {
                    ...notification,
                    actorName,
                    sound: true,
                    soundUrl: '/assets/notifications/notification.mp3'
                });
            }
            return notification;
        } catch (err) {
            console.error('Notification Error:', err);
        }
    }

    /**
     * Notify all connected users (Broadcast)
     */
    static async notifyAll(message, type = 'info', actorName = 'System') {
        try {
            // Log to DB for general system log (using null userId since it is a broadcast)
            const notification = await Notification.create({ userId: null, message, type, actorName });

            // Broadcast to all connected sockets for real-time UI updates
            if (global.io) {
                global.io.emit('notification', {
                    ...notification,
                    sound: true,
                    soundUrl: '/assets/notifications/notification.mp3'
                });
            }
        } catch (err) {
            console.error('Broadcast Notification Error:', err);
        }
    }
}

module.exports = NotificationService;
