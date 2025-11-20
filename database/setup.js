const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const db = new Sequelize({
  dialect: 'sqlite',
  storage: `database/${process.env.DB_NAME}` || 'database/task_management.db',
  logging: console.log
});

const User = db.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const Project = db.define('Project', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active'
    },
    dueDate: {
        type: DataTypes.DATE
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

const Task = db.define('Task', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    completed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    priority: {
        type: DataTypes.STRING,
        defaultValue: 'medium'
    },
    dueDate: {
        type: DataTypes.DATE
    },
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
});

User.hasMany(Project, { foreignKey: 'userId' });
Project.belongsTo(User, { foreignKey: 'userId' });

Project.hasMany(Task, { foreignKey: 'projectId' });
Task.belongsTo(Project, { foreignKey: 'projectId' });

module.exports = { db, User, Project, Task };

async function setupDatabase() {
    try {
        await db.authenticate();
        console.log('Connection to database established successfully.');
        
        await db.sync({ force: true });
        console.log('Database and tables created successfully.');
        
        await db.close();
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

if (require.main === module) {
    setupDatabase();
}
