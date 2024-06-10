const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chatSchema = new mongoose.Schema(
  {
    members: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        name: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const chatModel = mongoose.model("Chat", chatSchema);

module.exports = chatModel;
