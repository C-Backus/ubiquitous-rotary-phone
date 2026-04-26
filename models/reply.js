//reply framework
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Reply = sequelize.define('Reply', {
	content: {
		type: DataTypes.STRING,
		allowNull: false
	}
});

module.exports = Reply;
