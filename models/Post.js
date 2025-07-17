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
})

module.exports = mongoose.model("Post", postSchema);