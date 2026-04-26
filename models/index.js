//relationships
const sequelize = require('./db')
const User = require('./user');
const Post = require('./post');
const Reply = require('./reply');
const Like = require('./like');

//user and posts
User.hasMany(Post);
Post.belongsTo(User);

//posts and replies
Post.hasMany(Reply);
Reply.belongsTo(Post);

//posts and reblogs
Post.hasMany(Post, { as: 'Reblogs', foreignKey: 'rebloggedFromId' });
Post.belongsTo(Post, { as: 'OriginalPost', foreignKey: 'rebloggedFromId' });

//users and replies
User.hasMany(Reply);
Reply.belongsTo(User);

//likes
User.belongsToMany(Post, { through: Like, as: 'LikedPosts' });
Post.belongsToMany(User, { through: Like, as: "Likers" });

module.exports = {
    sequelize,
    User,
    Post,
    Reply,
    Like
};

