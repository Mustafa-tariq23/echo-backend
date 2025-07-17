const Post = require('../models/Post');
const pubsub = require('../utils/pubsub');

const POST_CREATED = 'POST_CREATED';
const POST_UPDATED = 'POST_UPDATED';
const POST_DELETED = 'POST_DELETED';
const POST_LIKED = 'POST_LIKED';

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         'unknown';
};

module.exports = {
  Query: {
    getPosts: async () => { 
      return await Post.find().sort({ createdAt: -1 });
    },
    getMyPosts: async (_, {}, { req }) => {
      const clientIP = getClientIP(req);
      return await Post.find({ createdBy: clientIP }).sort({ createdAt: -1 });
    }
  },
  Mutation: {
    createPost: async (_, { title, text, image }) => {
      const post = await Post.create({ title, text, image });
      pubsub.publish(POST_CREATED, { postAdded: post });
      return post;
    },
    updatePost: async (_, { _id, title, text, image }) => {
      const post = await Post.findByIdAndUpdate(
        _id,
        { title, text, image },
        { new: true }
      );
      pubsub.publish(POST_UPDATED, { postUpdated: post });
      return post;
    },
    deletePost: async (_, { _id }) => {
      const post = await Post.findByIdAndDelete(_id);
      pubsub.publish(POST_DELETED, { postDeleted: post });
      return post;
    },
    likePost: async (_, { _id, userIdentifier }, { req }) => {
      const post = await Post.findById(_id);
      
      // Always use IP address - ignore userIdentifier from frontend
      const clientIP = getClientIP(req);
      const identifier = clientIP;  // Only use IP address

      if(!post) {
        throw new Error('Post not found');
      }

      if(post.likedBy.includes(identifier)) {
        throw new Error('User has already liked this post');
      }

      post.likes += 1;
      post.likedBy.push(identifier);

      const updatedPost = await post.save();
      pubsub.publish(POST_LIKED, { postLiked: updatedPost });

      return updatedPost;
    },
    unlikePost: async (_, {_id, userIdentifier}, { req }) => {
      const post = await Post.findById(_id);
      
      // Always use IP address - ignore userIdentifier from frontend
      const clientIP = getClientIP(req);
      const identifier = clientIP;  // Only use IP address

      if(!post) {
        throw new Error('Post not found');
      }

      if(!post.likedBy.includes(identifier)) {
        throw new Error('User has not liked this post');
      }

      post.likes -= 1;
      post.likedBy = post.likedBy.filter(id => id !== identifier);

      const updatedPost = await post.save();
      pubsub.publish(POST_LIKED, { postLiked: updatedPost });

      return updatedPost;
    }
  },
  Subscription: {
    postAdded: {
      subscribe: () => pubsub.asyncIterator(POST_CREATED)
    },
    postUpdated: {
      subscribe: () => pubsub.asyncIterator(POST_UPDATED)
    },
    postDeleted: {
      subscribe: () => pubsub.asyncIterator(POST_DELETED)
    },
    postLiked: {
      subscribe: () => pubsub.asyncIterator(POST_LIKED)
    }
  }
}