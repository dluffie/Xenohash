// app.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const dotenv = require('dotenv');
const wsServer = require('./websocket/wsServer');
const miningService = require('./services/miningService');

// Routes
const authRoutes = require('./routes/auth');
const statsRoutes = require('./routes/stats');
const tasksRoutes = require('./routes/tasks');
const upgradesRoutes = require('./routes/upgrades');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/upgrades', upgradesRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Xenohash server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server instance
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize WebSocket server
    wsServer.initialize(server);
    
    // Initialize mining service
    miningService.initializeMiningState().then(() => {
      console.log('Mining service initialized');
    });
    
    // Start server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

module.exports = app;