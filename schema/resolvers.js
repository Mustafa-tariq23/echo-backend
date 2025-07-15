const Post = require('../models/Post');
const pubsub = require('../utils/pubsub');

const POST_CREATED = 'POST_CREATED';
const POST_UPDATED = 'POST_UPDATED';
const POST_DELETED = 'POST_DELETED';

module.exports = {
  Query: {
    getPosts: async () => { 
      return await Post.find().sort({ createdAt: -1 });
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
    }
  }
}