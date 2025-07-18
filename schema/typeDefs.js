const { gql } = require('apollo-server-express');

module.exports = gql`
  type Post {
    _id: ID!
    title: String
    text: String
    image: String
    likes: Int!
    likedBy: [String!]!
    replies: [Comment!]
    commentCount: Int!
    createdBy: String!
    createdAt: String
  }

  type Comment {
    _id: ID!
    postId: ID!
    parentId: ID
    text: String!
    createdBy: String!
    createdAt: String!
    likes: Int!
    likedBy: [String!]!
    depth: Int!
    replies: [Comment!]
  }

  type Query {
    getPosts: [Post]
    getMyPosts: [Post]
    getComments(postId: ID!): [Comment]
    getCommentReplies(commentId: ID!): [Comment]
  }

  type Mutation {
    createPost(title: String!, text: String!, image: String!): Post
    updatePost(_id: ID!, title: String, text: String, image: String): Post
    deletePost(_id: ID!): Post
    likePost(_id: ID!, userIdentifier: String!): Post
    unlikePost(_id: ID!, userIdentifier: String!): Post
    createComment(postId: ID!, text: String!, parentId: ID): Comment
    updateComment(_id: ID!, text: String!): Comment
    deleteComment(_id: ID!): Comment
    likeComment(_id: ID!, userIdentifier: String!): Comment
    unlikeComment(_id: ID!, userIdentifier: String!): Comment
  }

  type Subscription {
    postAdded: Post
    postUpdated: Post
    postDeleted: Post
    postLiked: Post
    commentAdded(postId: ID!): Comment
    commentUpdated(commentId: ID!): Comment
    commentLiked(commentId: ID!): Comment
  }`