const { gql } = require('apollo-server-express');

module.exports = gql`
  type Post {
    _id: ID!
    title: String
    text: String
    image: String
    likes: Int!
    likedBy: [String!]!
    createdBy: String!
    createdAt: String
  }

  type Query {
    getPosts: [Post]
    getMyPosts: [Post]
  }

  type Mutation {
    createPost(title: String!, text: String!, image: String!): Post
    updatePost(_id: ID!, title: String, text: String, image: String): Post
    deletePost(_id: ID!): Post
    likePost(_id: ID!, userIdentifier: String!): Post
    unlikePost(_id: ID!, userIdentifier: String!): Post
  }

  type Subscription {
    postAdded: Post
    postUpdated: Post
    postDeleted: Post
    postLiked: Post
  }`