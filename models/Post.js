const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: String,
  text: String,
  image: String,
  likes: {
    type: Number,
    default: 0,
  },
  likedBy: [{
    type: String,
    default: []
  }],
  createdBy: {
    type: String,
    required: true,
    default: 'unknown',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  // Enable virtual fields in JSON output
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual field to populate comments for this post
postSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  match: { parentId: null }, // Only get top-level comments
  options: { sort: { createdAt: -1 } }
});

// Virtual field to calculate total comment count
postSchema.virtual('commentCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'postId',
  count: true
});

// Add indexes for better query performance
postSchema.index({ createdBy: 1 });
postSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Post", postSchema);