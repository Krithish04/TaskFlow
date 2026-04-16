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

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/comments', require('./routes/comments'));

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
