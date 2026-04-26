//------ Sequelize Setup & frameworks ------
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: '/var/www/myconet-api/myconetDatabase.db'
});

module.exports = sequelize;