require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for frontend connection
app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
});

// Postgres Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- REST Endpoints ---

// GET /api/tasks (Supports ?status=pending)
app.get('/api/tasks', async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT * FROM tasks ORDER BY created_at DESC';
    let params = [];
    
    if (status) {
      query = 'SELECT * FROM tasks WHERE status = $1 ORDER BY created_at DESC';
      params = [status];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required" });

  try {
    const result = await pool.query(
      'INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING *',
      [title, description]
    );
    const newTask = result.rows[0];

    // Real-time: Notify all clients
    io.emit('task_created', newTask);
    
    res.status(201).json(newTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Task not found" });
    const updatedTask = result.rows[0];
    
    // Real-time: Notify all clients
    io.emit('task_updated', updatedTask);

    res.json(updatedTask);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Task not found" });

    // Real-time: Notify all clients
    io.emit('task_deleted', id);

    res.json({ message: "Task deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});