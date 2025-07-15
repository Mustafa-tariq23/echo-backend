const { gql } = require('apollo-server-express');

module.exports = gql`
  type Post {
    _id: ID!
    title: String
    text: String
    image: String
    createdAt: String
  }

  type Query {
    getPosts: [Post]
  }

  type Mutation {
    createPost(title: String!, text: String!, image: String!): Post
    updatePost(_id: ID!, title: String, text: String, image: String): Post
    deletePost(_id: ID!): Post
  }

  type Subscription {
    postAdded: Post
    postUpdated: Post
    postDeleted: Post
  }`