const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    appData: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    edits: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserData', userDataSchema);
