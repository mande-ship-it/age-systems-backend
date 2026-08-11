require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const scholarRoutes = require('./routes/scholarRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const academicRoutes = require('./routes/academicRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const sponsorRoutes = require('./routes/sponsorRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const eventRoutes = require('./routes/eventRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const aiRoutes = require('./routes/aiRoutes');
const internshipRoutes = require('./routes/internshipRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const performanceRoutes = require('./routes/performanceRoutes');
const meetingRoutes = require('./routes/meetingRoutes');

// Import schedulers
const { initSchedulers } = require('./utils/scheduler');

// Import error handler middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('etag', false);
const path = require('path');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["https://scholar-management-system.onrender.com", "http://localhost:3000"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});
const PORT = process.env.PORT || 5000;

global.io = io;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their notification room.`);
    });

    socket.on('join_meeting', (meetingId) => {
        socket.join(`meeting_${meetingId}`);
        console.log(`User joined meeting room: meeting_${meetingId}`);
    });

    socket.on('meeting_message', (data) => {
        // Broadcast to everyone in the meeting room
        io.to(`meeting_${data.meetingId}`).emit('new_meeting_message', data);
    });

    socket.on('initiate_call', (data) => {
        // data contains: meetingId, participants (array of user IDs), callerName, isVideo
        const { participants, meetingId } = data;
        if (participants && Array.isArray(participants)) {
            participants.forEach(userId => {
                io.to(`user_${userId}`).emit('incoming_call', data);
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

app.use(cors({
    origin: ["https://scholar-management-system.onrender.com", "http://localhost:3000", "http://localhost:5000", "http://localhost:5500", "http://localhost:8080"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Scholar Management System Backend API',
        version: '1.0.0'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/scholars', scholarRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/schools', schoolRoutes);
app.use('/api/sponsors', sponsorRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/meetings', meetingRoutes);

app.use(errorHandler);

// Connect to MongoDB then start server
connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        initSchedulers();
        console.log('--------------------------------------------------');
        console.log('Scholar Management System Backend API Server');
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('--------------------------------------------------');

        // Keep-Alive / Anti-Sleep Workaround for Render Free Tier
        const https = require('https');
        const RELOAD_URL = 'https://scholar-management-system.onrender.com';

        setInterval(() => {
            https.get(RELOAD_URL, (res) => {
                if (res.statusCode === 200) {
                    console.log('Reload successful: Service kept alive.');
                }
            }).on('error', (err) => {
                console.error('Error during keep-alive ping:', err.message);
            });
        }, 14 * 60 * 1000); // Ping every 14 minutes to stay within the 15-minute timeout
    });
});
