require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        completed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('[db] tasks table ready');
  } catch (err) {
    console.error('[db] init error:', err.message);
  }
};

app.get('/', (_req, res) =>
  res.json({ status: 'ok', service: 'be-todo' })
);

app.get('/api/tasks', async (_req, res) => {
  try {
    const r = await pool.query('SELECT * FROM tasks ORDER BY id DESC');
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const r = await pool.query(
      'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const r = await pool.query(
      `UPDATE tasks
         SET title     = COALESCE($1, title),
             completed = COALESCE($2, completed)
       WHERE id = $3
       RETURNING *`,
      [title ?? null, completed ?? null, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`[be-todo] listening on port ${PORT}`);
});