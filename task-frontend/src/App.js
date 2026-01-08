import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://localhost:5000');
const API_URL = 'http://localhost:5000/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [filter, setFilter] = useState('all');


  useEffect(() => {
    fetchTasks();
  }, [filter]);

  useEffect(() => {
    socket.on('task_created', (task) => setTasks((prev) => [task, ...prev]));
    socket.on('task_updated', (uTask) => setTasks((prev) => prev.map(t => t.id === uTask.id ? uTask : t)));
    socket.on('task_deleted', (id) => setTasks((prev) => prev.filter(t => t.id !== parseInt(id))));
    return () => { socket.off('task_created'); socket.off('task_updated'); socket.off('task_deleted'); };
  }, []);

  const fetchTasks = async () => {
    const query = filter !== 'all' ? `?status=${filter}` : '';
    try {
      const res = await axios.get(`${API_URL}${query}`);
      setTasks(res.data);
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    try {
      await axios.post(API_URL, { title: newTaskTitle, description: newTaskDesc });
      setNewTaskTitle('');
      setNewTaskDesc('');
    } catch (err) { console.error(err); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try { await axios.patch(`${API_URL}/${id}`, { status: newStatus }); } 
    catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this task?")) return;
    try { await axios.delete(`${API_URL}/${id}`); } 
    catch (err) { console.error(err); }
  };


  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#d4edda'; 
      case 'in-progress': return '#fff3cd'; 
      default: return '#e2e3e5'; 
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Task Manager</h1>
      </header>

      {}
      <div className="tabs">
        {['all', 'pending', 'in-progress', 'completed'].map(status => (
          <button 
            key={status} 
            className={`tab ${filter === status ? 'active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {}
      <form onSubmit={handleCreate} className="task-form">
        <input 
          type="text" 
          value={newTaskTitle} 
          onChange={(e) => setNewTaskTitle(e.target.value)} 
          placeholder="Task Title" 
          required 
        />
        <input 
          type="text" 
          value={newTaskDesc} 
          onChange={(e) => setNewTaskDesc(e.target.value)} 
          placeholder="Description (Optional)" 
        />
        <button type="submit">Create Task</button>
      </form>

      {}
      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-card" style={{ borderLeft: `5px solid ${getStatusColor(task.status)}` }}>
            <div className="task-header">
              <h3>{task.title}</h3>
              {}
              <button onClick={() => handleDelete(task.id)} className="delete-btn" title="Delete">🗑️</button>
            </div>
            
            <p className="task-desc">{task.description}</p>
            
            <div className="task-footer">
              <span className="date">Created: {new Date(task.created_at).toLocaleDateString()}</span>
              
              {}
              <select 
                value={task.status} 
                onChange={(e) => handleStatusChange(task.id, e.target.value)}
                className="status-select"
                style={{ backgroundColor: getStatusColor(task.status) }}
              >
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
        {tasks.length === 0 && <p className="empty-state">No tasks found.</p>}
      </div>
    </div>
  );
}

export default App;