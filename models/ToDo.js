const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ToDoSchema = new Schema({
    text: String,
    self: Boolean,
    assignee: String,
    deadline: Date,
})
const ToDo = mongoose.model('Todo', ToDoSchema);

module.exports = ToDo;