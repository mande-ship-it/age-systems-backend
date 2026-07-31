require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const pool = require('./config/database');

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

// Import schedulers
const { initSchedulers } = require('./utils/scheduler');

// Import error handler middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
app.set('etag', false); // Disable ETag to prevent 304 errors in Flutter/Dio without cache
const path = require('path');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});
const PORT = process.env.PORT || 5000;

// Make io accessible globally
global.io = io;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined their notification room.`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Middleware
app.use(cors());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Home Route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Scholar Management System Backend API',
        version: '1.0.0'
    });
});

// API Routes Mounting
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

// Global Error Handler
app.use(errorHandler);

// Test DB connection, then start server
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log(' Database connected at:', res.rows[0].now);
    }

    server.listen(PORT, '0.0.0.0', () => {
        // Initialize Schedulers
        initSchedulers();

        console.log('--------------------------------------------------');
        console.log('Scholar Management System Backend API Server');
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Accessible on your network at http://<your-ip>:${PORT}`);
        console.log('--------------------------------------------------');
    });
});
