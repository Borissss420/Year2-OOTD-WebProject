'use strict';
const pool = require('../database/db');
const { httpError } = require('../utils/errors');
const promisePool = pool.promise();

// get all categories
const getAllCategories = async () => {
  try {
    const [rows] = await promisePool.query('SELECT * FROM categories');
    return rows;
  } catch (e) {
    console.error('error getting all categories', e.message);
  }
}

// get all posts
const getAllPosts = async (userId) => {
    try {
      const [rows] = await promisePool.query('SELECT user_post.post_id, ootd_user.user_id, ootd_user.username, ootd_user.profile_pic, image, description, categories.cid, categories.category, COUNT(post_likes.post_id) AS likes, (SELECT COUNT(*) FROM post_likes WHERE user_id = ? AND post_id = user_post.post_id) as liked, upload_time, time_stamp FROM user_post INNER JOIN ootd_user ON user_post.user_id = ootd_user.user_id JOIN categories ON user_post.category = categories.cid LEFT JOIN post_likes ON user_post.post_id = post_likes.post_id GROUP BY user_post.post_id ORDER BY user_post.upload_time DESC;', [userId]);
      return rows;
    } catch (e) {
      console.error('error getting all posts', e.message);
    };
};

// get all posts by category in highlight
const getAllPostByCategory = async (categoryId) => {
    try {
      const [rows] = await promisePool.query('SELECT user_post.post_id, ootd_user.user_id, ootd_user.username, ootd_user.profile_pic, image, description, categories.cid, categories.category, COUNT(post_likes.post_id) AS likes, upload_time, time_stamp FROM user_post INNER JOIN ootd_user ON user_post.user_id = ootd_user.user_id JOIN categories ON user_post.category = categories.cid LEFT JOIN post_likes ON user_post.post_id = post_likes.post_id WHERE user_post.category = ? GROUP BY user_post.post_id ORDER BY user_post.upload_time DESC;', [categoryId]);
      return rows;
    } catch (e) {
      console.error('error getting post by category', e.message);
    }
};

// get one single post
const getPost = async(postId, next) => {
    try{
        const[rows] = await promisePool.execute('SELECT post_id, ootd_user.username, ootd_user.profile_pic, image, description, categories.cid, categories.category, COUNT(post_likes.post_id) AS likes, upload_time, time_stamp FROM user_post INNER JOIN ootd_user ON user_post.user_id = ootd_user.user_id JOIN categories ON user_post.category = categories.cid LEFT JOIN post_likes USING(post_id) WHERE post_id = ? GROUP BY post_likes.post_id;', [postId]);
        return rows[0];
    } catch (e){
      console.log('error getting post', e.message);
      const err = httpError('Sql error', 500);
      next(err);
    }
};

// insert post
const insertPost = async (post) =>{
  try{
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    const[rows] = await promisePool.execute('INSERT INTO user_post (user_id, image, description, category, upload_time) VALUES (?,?,?,?,?)', 
    [post.userId, post.filename, post.description, post.category, dateTime]);
    return rows.insertId;
  }catch(e){
    console.error('model insert post', e.message);
    const err = httpError('Sql error', 500);
    next(err);
  };
};

// delete post
const deletePost = async (postId, user_id, role) => {
  //delete all likes of the post before delete the post because of the link of foreign key
  let sql1 = 'Delete from post_likes where post_likes.post_id = ?;';
  let sql2 = 'Delete from user_post where user_post.post_id = ? AND user_post.user_id = ?;';
  let params1 = [postId]
  let params2 = [postId, user_id];
  if (role === 0){
    sql2 = 'Delete from user_post where user_post.post_id = ?;';
    params2 = [postId];
  }
  try {
    const[rows1] = await promisePool.execute(sql1, params1);
    const[rows2] = await promisePool.execute(sql2, params2);
    return rows1.affectedRows === 1, rows2.affectedRows === 1;
  } catch (e) {
    console.error('error deleting post in model:', e.message);
  }
};

// get the no. of likes from a single post
const getLikeOfPost = async (postId) => {
  try {
    const [rows] = await promisePool.execute('SELECT COUNT (*) as likes FROM post_likes WHERE post_id = ?', [postId]);
    return rows;
  } catch (e){
    console.log('error getting likes of post', e.message);
    const err = httpError('Sql error', 500);
    next(err);
  }
};

// manage likes on posts, add or remove likes
const manageLikes = async (userId, postId) => {
  try {
    const [check] = await promisePool.execute('SELECT COUNT(*) AS likes FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    if (check[0].likes === 0){
      const [rows] = await promisePool.execute('INSERT INTO post_likes (user_id, post_id) VALUES (?,?)', [userId, postId]);
      const [getLikes] = await promisePool.execute("SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?", [postId]);
      return [getLikes[0].total, 1];
    }
    else {
      const [rows] = await promisePool.execute('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      const [getLikes] = await promisePool.execute("SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?", [postId]);
      return [getLikes[0].total, 0];
    }
  } catch (e){
    console.error('error managing likes', e.message);
  }
};  


module.exports = {
  getAllCategories,
  getAllPosts,
  getAllPostByCategory,
  getPost,
  insertPost,
  deletePost,
  getLikeOfPost,
  manageLikes,
};
  