const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

/* ── STATUS FEATURE INTEGRATION START ── */
// 1. Import the status router and the cleanup function
const { router: statusRouter, markIdleUsers } = require('./routes/status');

// 2. Register the route (This fixes the 404 error)
app.use('/api/status', statusRouter);

// 3. Run the background job every 2 minutes to mark inactive users as 'Away'
setInterval(markIdleUsers, 2 * 60 * 1000);
/* ── STATUS FEATURE INTEGRATION END ── */

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/projects', require('./routes/projects'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', time: new Date() }));

// Connect DB & start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/taskflow')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });