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
const BACKEND_URL = 'https://scholar-management-api.onrender.com';
const FRONTEND_URL = 'https://scholar-management-system.onrender.com';

// 1. Unified CORS Configuration
const allowedOrigins = [
    BACKEND_URL,
    FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5000",
    "http://localhost:8080",
    "http://localhost:57511" // Flutter default debug port
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps) or allowed origins
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost')) {
            callback(null, true);
        } else {
            console.log('❌ CORS Blocked:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// 2. Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

global.io = io;

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
    });
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// 3. Global Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static Files
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('assets'));

// 4. API Endpoints
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Scholar Management System API',
        status: 'Online',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
    });
});

// Health check for Render
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
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

// 5. Error Handler
app.use(require('./middleware/errorHandler'));

// 6. Connect Database & Start Server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Server live on port ${PORT}`);

        // --- KEEP-ALIVE WORKAROUND ---
        // Pings itself every 14 minutes to prevent Render sleep mode
        const https = require('https');
        setInterval(() => {
            https.get(BACKEND_URL, (res) => {
                if (res.statusCode === 200) {
                    console.log('💓 Heartbeat: Production Pulse Check Successful');
                }
            }).on('error', (err) => {
                console.error('💓 Heartbeat Error:', err.message);
            });
        }, 14 * 60 * 1000);
    });
});
