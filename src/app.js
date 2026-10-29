const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'IMS Backend is running with MongoDB' });
});

// --- ROUTES ---
app.use('/api/v1/auth', require('./modules/auth/routes/authRoutes'));
app.use('/api/v1/users', require('./modules/users/routes/userRoutes'));
app.use('/api/v1/library', require('./modules/library/routes/libraryRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error' 
  });
});

// THIS IS THE MOST IMPORTANT LINE
module.exports = app; 