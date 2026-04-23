const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron'); // Import node-cron
const User = require('./models/User'); // Import User model

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

/* ── STATUS FEATURE INTEGRATION ── */
const { router: statusRouter, markIdleUsers } = require('./routes/status');
app.use('/api/status', statusRouter);

// Existing 2-minute interval for 'Away' status
setInterval(markIdleUsers, 2 * 60 * 1000);

// NEW: Daily Cron Job to refresh "On Leave" status
// This runs every day at midnight (00:00)
cron.schedule('0 0 * * *', async () => {
    try {
        const today = new Date();
        const result = await User.updateMany(
            { 
                status: 'On Leave', 
                leaveUntil: { $lt: today } 
            },
            { 
                $set: { status: 'Offline', leaveUntil: null } 
            }
        );
        if (result.modifiedCount > 0) {
            console.log(`✅ Auto-refreshed ${result.modifiedCount} users from Leave to Offline.`);
        }
    } catch (err) {
        console.error('❌ Error in daily leave cleanup:', err);
    }
});
/* ── END STATUS FEATURE INTEGRATION ── */

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