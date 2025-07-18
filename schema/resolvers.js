const Post = require('../models/Post');
const Comment = require('../models/Comment');
const pubsub = require('../utils/pubsub');

const POST_CREATED = 'POST_CREATED';
const POST_UPDATED = 'POST_UPDATED';
const POST_DELETED = 'POST_DELETED';
const POST_LIKED = 'POST_LIKED';
const COMMENT_CREATED = 'COMMENT_CREATED';
const COMMENT_UPDATED = 'COMMENT_UPDATED';
const COMMENT_DELETED = 'COMMENT_DELETED';
const COMMENT_LIKED = 'COMMENT_LIKED';

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
    },
    getComments: async (_, { postId }) => {
      return await Comment.find({ postId, parentId: null })
        .sort({ createdAt: -1 })
        .populate('replies');
    },
    getCommentReplies: async (_, { commentId }) => {
      return await Comment.find({ parentId: commentId })
        .sort({ createdAt: -1 });
    }
  },
  Mutation: {
    createPost: async (_, { title, text, image }, { req }) => {
      const clientIP = getClientIP(req);
      const post = await Post.create({ 
        title, 
        text, 
        image, 
        createdBy: clientIP 
      });
      pubsub.publish(POST_CREATED, { postAdded: post });
      return post;
    },
    updatePost: async (_, { _id, title, text, image }, { req }) => {
      const clientIP = getClientIP(req);
      
      const existingPost = await Post.findById(_id);
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      if (existingPost.createdBy !== clientIP) {
        throw new Error('You can only update your own posts');
      }
      
      const post = await Post.findByIdAndUpdate(
        _id,
        { title, text, image },
        { new: true }
      );
      pubsub.publish(POST_UPDATED, { postUpdated: post });
      return post;
    },
    deletePost: async (_, { _id }, { req }) => {
      const clientIP = getClientIP(req);
      
      const existingPost = await Post.findById(_id);
      if (!existingPost) {
        throw new Error('Post not found');
      }
      
      if (existingPost.createdBy !== clientIP) {
        throw new Error('You can only delete your own posts');
      }
      
      const post = await Post.findByIdAndDelete(_id);
      pubsub.publish(POST_DELETED, { postDeleted: post });
      return post;
    },
    likePost: async (_, { _id, userIdentifier }, { req }) => {
      const post = await Post.findById(_id);
      const clientIP = getClientIP(req);
      const identifier = clientIP;

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
      const clientIP = getClientIP(req);
      const identifier = clientIP;

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
    },
    createComment: async (_, { postId, text, parentId }, { req }) => {
      const clientIP = getClientIP(req);
      
      // Calculate depth
      let depth = 0;
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (!parentComment) {
          throw new Error('Parent comment not found');
        }
        depth = parentComment.depth + 1;
        
        // Limit nesting depth (e.g., max 5 levels)
        if (depth > 5) {
          throw new Error('Maximum nesting depth reached');
        }
      }

      const comment = await Comment.create({
        postId,
        parentId,
        text,
        createdBy: clientIP,
        depth
      });

      pubsub.publish(COMMENT_CREATED, { commentAdded: comment });
      return comment;
    },
    updateComment: async (_, { _id, text }, { req }) => {
      const clientIP = getClientIP(req);
      
      const existingComment = await Comment.findById(_id);
      if (!existingComment) {
        throw new Error('Comment not found');
      }
      
      if (existingComment.createdBy !== clientIP) {
        throw new Error('You can only update your own comments');
      }

      const comment = await Comment.findByIdAndUpdate(
        _id,
        { text },
        { new: true }
      );
      
      pubsub.publish(COMMENT_UPDATED, { commentUpdated: comment });
      return comment;
    },
    deleteComment: async (_, { _id }, { req }) => {
      const clientIP = getClientIP(req);
      
      const existingComment = await Comment.findById(_id);
      if (!existingComment) {
        throw new Error('Comment not found');
      }
      
      if (existingComment.createdBy !== clientIP) {
        throw new Error('You can only delete your own comments');
      }

      // Delete the comment and all its replies
      await Comment.deleteMany({ 
        $or: [
          { _id: _id },
          { parentId: _id }
        ]
      });

      pubsub.publish(COMMENT_DELETED, { commentDeleted: existingComment });
      return existingComment;
    },
    likeComment: async (_, { _id, userIdentifier }, { req }) => {
      const comment = await Comment.findById(_id);
      const clientIP = getClientIP(req);
      const identifier = clientIP;

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (comment.likedBy.includes(identifier)) {
        throw new Error('User has already liked this comment');
      }

      comment.likes += 1;
      comment.likedBy.push(identifier);

      const updatedComment = await comment.save();
      pubsub.publish(COMMENT_LIKED, { commentLiked: updatedComment });

      return updatedComment;
    },
    unlikeComment: async (_, { _id, userIdentifier }, { req }) => {
      const comment = await Comment.findById(_id);
      const clientIP = getClientIP(req);
      const identifier = clientIP;

      if (!comment) {
        throw new Error('Comment not found');
      }

      if (!comment.likedBy.includes(identifier)) {
        throw new Error('User has not liked this comment');
      }

      comment.likes -= 1;
      comment.likedBy = comment.likedBy.filter(id => id !== identifier);

      const updatedComment = await comment.save();
      pubsub.publish(COMMENT_LIKED, { commentLiked: updatedComment });

      return updatedComment;
    }
  },
  // Virtual field resolvers
  Post: {
    replies: async (parent) => {
      return await Comment.find({ postId: parent._id, parentId: null })
        .sort({ createdAt: -1 });
    },
    commentCount: async (parent) => {
      return await Comment.countDocuments({ postId: parent._id });
    }
  },
  Comment: {
    replies: async (parent) => {
      return await Comment.find({ parentId: parent._id })
        .sort({ createdAt: -1 });
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
    },
    commentAdded: {
      subscribe: (_, { postId }) => pubsub.asyncIterator(COMMENT_CREATED)
    },
    commentUpdated: {
      subscribe: (_, { commentId }) => pubsub.asyncIterator(COMMENT_UPDATED)
    },
    commentLiked: {
      subscribe: (_, { commentId }) => pubsub.asyncIterator(COMMENT_LIKED)
    }
  }
}