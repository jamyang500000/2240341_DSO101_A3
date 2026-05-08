import React, { useState, useEffect } from 'react';

// IMPORTANT: REACT_APP_API_URL is baked in at BUILD time, not runtime.
// In production, the value is supplied as a Docker build arg by render.yaml.
const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
      setError('');
    } catch (e) {
      setError(`Could not reach API at ${API}: ${e.message}`);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    setTitle('');
    load();
  };

  const toggle = async (t) => {
    await fetch(`${API}/api/tasks/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !t.completed })
    });
    load();
  };

  const remove = async (id) => {
    await fetch(`${API}/api/tasks/${id}`, { method: 'DELETE' });
    load();
  };

  const saveEdit = async (id) => {
    if (!editTitle.trim()) return;
    await fetch(`${API}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle })
    });
    setEditingId(null);
    load();
  };

  return (
    <div className="app">
      <h1>To-Do List</h1>
      <p className="api">API: {API}</p>
      {error && <div className="error">{error}</div>}

      <form onSubmit={add} className="add-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>

      <ul className="task-list">
        {tasks.map((t) => (
          <li key={t.id} className={t.completed ? 'done' : ''}>
            <input
              type="checkbox"
              checked={t.completed}
              onChange={() => toggle(t)}
            />
            {editingId === t.id ? (
              <>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
                <button onClick={() => saveEdit(t.id)}>Save</button>
                <button onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="title">{t.title}</span>
                <button onClick={() => { setEditingId(t.id); setEditTitle(t.title); }}>
                  Edit
                </button>
                <button onClick={() => remove(t.id)} className="danger">
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
        {tasks.length === 0 && !error && (
          <li className="empty">No tasks yet — add one above.</li>
        )}
      </ul>
    </div>
  );
}

export default App;
