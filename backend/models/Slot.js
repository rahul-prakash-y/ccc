const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
    round: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
        required: true,
        index: true
    },
    label: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    teams: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }],
    maxCapacity: {
        type: Number,
        default: null // null = unlimited
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Slot', slotSchema);
