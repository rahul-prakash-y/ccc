const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    round: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    inputFormat: {
        type: String,
        default: ''
    },
    outputFormat: {
        type: String,
        default: ''
    },
    sampleInput: {
        type: String,
        default: ''
    },
    sampleOutput: {
        type: String,
        default: ''
    },
    difficulty: {
        type: String,
        enum: ['EASY', 'MEDIUM', 'HARD'],
        default: 'MEDIUM'
    },
    points: {
        type: Number,
        default: 10
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);
