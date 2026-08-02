const cron = require('node-cron');
const Event = require('../models/Event');
const User = require('../models/User');
const { sendEventNotificationEmail } = require('./notifier');

/**
 * Initialize all scheduled tasks (Cron Jobs)
 */
const initSchedulers = () => {
    // 1. Daily Event Reminder (Runs every day at 8:00 AM)
    // Checks for events happening in exactly 2 days.
    cron.schedule('0 8 * * *', async () => {
        console.log('⏰ Running daily event reminder check...');
        try {
            const upcomingEvents = await Event.getEventsInDays(2);

            if (upcomingEvents.length === 0) {
                console.log('ℹ️ No events found for reminder (2 days remaining).');
            } else {
                const users = await User.getAll();

                for (const event of upcomingEvents) {
                    console.log(`🔔 Sending reminders for event: "${event.title}"`);

                    const emailPromises = users.map(user =>
                        sendEventNotificationEmail({
                            email: user.email,
                            name: user.fullName,
                            event: {
                                ...event,
                                title: `REMINDER: ${event.title} (In 2 days)`
                            }
                        })
                    );

                    await Promise.allSettled(emailPromises);
                }
                console.log(`✅ Daily reminders sent for ${upcomingEvents.length} event(s).`);
            }

            // Also run history cleanup daily
            console.log('🧹 Cleaning up old event history (>2 days)...');
            const deleted = await Event.cleanupHistory();
            if (deleted.length > 0) {
                console.log(`🗑️ Deleted ${deleted.length} expired history events.`);
            }
        } catch (err) {
            console.error('❌ Scheduler Error:', err.message);
        }
    });

    // 2. Automatic Event Transition (Runs every 30 minutes)
    // Moves events that have started/finished to 'History'
    cron.schedule('*/30 * * * *', async () => {
        console.log('🔄 Checking for events to move to history...');
        try {
            const moved = await Event.autoMoveToHistory();
            if (moved.length > 0) {
                console.log(`📜 Moved ${moved.length} events to history.`);
                moved.forEach(e => console.log(`   - ${e.title}`));
            }
        } catch (err) {
            console.error('❌ Transition Scheduler Error:', err.message);
        }
    });

    // 3. Automatic Graduation Transition (Runs every 1 hour)
    cron.schedule('0 * * * *', async () => {
        console.log('🎓 Checking for scholars due for graduation...');
        try {
            const Scholar = require('../models/Scholar');
            const graduated = await Scholar.autoTransitionGraduates();
            if (graduated.length > 0) {
                console.log(`🎓 Successfully transitioned ${graduated.length} scholars to "Graduated" status.`);
                const NotificationService = require('./notificationService');
                await NotificationService.notifyAll(
                    `🎓 ${graduated.length} scholars have officially completed their program cycle and moved to the Alumni Registry.`,
                    'success',
                    'System Scheduler'
                );
            }
        } catch (err) {
            console.error('❌ Graduation Scheduler Error:', err.message);
        }
    });

    // 4. Internship Completion Check (Runs every 1 hour)
    cron.schedule('5 * * * *', async () => {
        console.log('💼 Checking for completed internships...');
        try {
            const Internship = require('../models/Internship');
            const completed = await Internship.autoProcessCompletions();
            if (completed.length > 0) {
                console.log(`💼 Successfully marked ${completed.length} internships as "Completed".`);
                const NotificationService = require('./notificationService');
                await NotificationService.notifyAll(
                    `💼 ${completed.length} scholars have successfully completed their one-year internship cycle.`,
                    'info',
                    'System Scheduler'
                );
            }
        } catch (err) {
            console.error('❌ Internship Scheduler Error:', err.message);
        }
    });

    console.log('🚀 Schedulers initialized (Reminders/Cleanup: 8 AM, Transition: 30m, Graduation: 1h, Internship: 1h)');
};

module.exports = {
    initSchedulers
};
