const mongoose = require('mongoose');

const roundSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['SQL Contest', 'HTML/CSS Quiz', 'UI/UX Challenge', 'Debug Challenge', 'Mini Hackathon']
    },
    description: {
        type: String
    },
    startOtp: {
        type: String,
        length: 6,
        default: null // Generated live by admin
    },
    endOtp: {
        type: String,
        length: 6,
        default: null // Generated live by admin
    },
    durationMinutes: {
        type: Number,
        required: true,
        default: 60 // 1 hour continuous timer
    },
    status: {
        type: String,
        enum: ['LOCKED', 'WAITING_FOR_OTP', 'RUNNING', 'COMPLETED'],
        default: 'LOCKED'
    },
    // Allows admins to globally turn on/off OTP entry for the round
    isOtpActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Round', roundSchema);
