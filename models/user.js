//user framework
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    locationLat: {
	type: DataTypes.FLOAT,
	allowNull: true
    },
    locationLong: {
        type: DataTypes.FLOAT,
        allowNull: true
    }
});

module.exports = User;