const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { db, User, Project, Task } = require('./database/setup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'secretkey',
  resave: false,
  saveUninitialized: false
}));

async function testConnection() {
  try {
    await db.authenticate();
  } catch (error) {
    console.error(error);
  }
}
testConnection();

function authRequired(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' });
  next();
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already in use' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    res.json({ id: user.id, username: user.username, email: user.email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    res.json({ message: 'Logged in' }); 
  } catch (error) {
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out' });
  });
});

app.get('/api/projects', authRequired, async (req, res) => {
  try {
    const projects = await Project.findAll({ where: { userId: req.session.userId } });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.get('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

app.post('/api/projects', authRequired, async (req, res) => {
  try {
    const { name, description, status, dueDate } = req.body;
    const newProject = await Project.create({ name, description, status, dueDate, userId: req.session.userId });
    res.status(201).json(newProject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ error: 'Project not found' });
    const { name, description, status, dueDate } = req.body;
    await Project.update({ name, description, status, dueDate }, { where: { id: req.params.id } });
    const updated = await Project.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', authRequired, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project || project.userId !== req.session.userId) return res.status(404).json({ error: 'Project not found' });
    await Project.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

app.get('/api/tasks', authRequired, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      include: {
        model: Project,
        where: { userId: req.session.userId }
      }
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.get('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: Project });
    if (!task || task.Project.userId !== req.session.userId) return res.status(404).json({ error: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

app.post('/api/tasks', authRequired, async (req, res) => {
  try {
    const { title, description, completed, priority, dueDate, projectId } = req.body;
    const project = await Project.findByPk(projectId);
    if (!project || project.userId !== req.session.userId) return res.status(400).json({ error: 'Invalid project' });
    const newTask = await Task.create({ title, description, completed, priority, dueDate, projectId });
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: Project });
    if (!task || task.Project.userId !== req.session.userId) return res.status(404).json({ error: 'Task not found' });
    const { title, description, completed, priority, dueDate, projectId } = req.body;
    if (projectId) {
      const project = await Project.findByPk(projectId);
      if (!project || project.userId !== req.session.userId) return res.status(400).json({ error: 'Invalid project' });
    }
    await Task.update({ title, description, completed, priority, dueDate, projectId }, { where: { id: req.params.id } });
    const updated = await Task.findByPk(req.params.id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

app.delete('/api/tasks/:id', authRequired, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, { include: Project });
    if (!task || task.Project.userId !== req.session.userId) return res.status(404).json({ error: 'Task not found' });
    await Task.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
