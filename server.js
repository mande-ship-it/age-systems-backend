require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);

// Production URLs
const BACKEND_URL = 'https://age-systems-backend.onrender.com';
const FRONTEND_URL = 'https://scholar-management-system.onrender.com';

const allowedOrigins = [
    BACKEND_URL,
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:8080",
    "http://localhost:57511"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            console.log('CORS Blocked for origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 5000;
global.io = io;

io.on('connection', (socket) => {
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
    });
    socket.on('disconnect', () => {});
});

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('assets'));

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Scholar Management System API',
        status: 'Online',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected' });
});

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/scholars', require('./routes/scholarRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/academic', require('./routes/academicRoutes'));
app.use('/api/schools', require('./routes/schoolRoutes'));
app.use('/api/sponsors', require('./routes/sponsorRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/internships', require('./routes/internshipRoutes'));
app.use('/api/performance', require('./routes/performanceRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/roles', require('./routes/roleRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));

app.use(require('./middleware/errorHandler'));

// Catch-all for 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found on this server.' });
});

connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Production Server running on port ${PORT}`);

        if (process.env.NODE_ENV === 'production') {
            const https = require('https');
            setInterval(() => {
                https.get(BACKEND_URL, (res) => {
                    if (res.statusCode === 200) console.log('💓 Heartbeat: SUCCESS');
                }).on('error', (e) => console.error('💓 Heartbeat: FAIL', e.message));
            }, 14 * 60 * 1000);
        }
    });
});
