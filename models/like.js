//like framework
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Like = sequelize.define('Like', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
    }
});

module.exports = Like;