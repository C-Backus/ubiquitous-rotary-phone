//post framework
const { DataTypes } = require("sequelize");
const sequelize = require("./db");

const Post = sequelize.define('Post', {
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    locationLat: DataTypes.FLOAT,
    locationLong: DataTypes.FLOAT,

    //reblog = reference to another post
    rebloggedFromId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
});

module.exports = Post;