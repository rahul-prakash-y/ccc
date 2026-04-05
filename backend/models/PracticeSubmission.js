const mongoose = require('mongoose');

const practiceSubmissionSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    round: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Round',
        required: true
    },
    status: {
        type: String,
        enum: ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'DISQUALIFIED', 'COMPLETED'],
        default: 'NOT_STARTED'
    },
    startTime: {
        type: Date,
        default: null
    },
    endTime: {
        type: Date,
        default: null
    },
    codeContent: {
        type: String,
        default: ''
    },
    pdfUrl: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: null 
    },
    autoScore: {
        type: Number,
        default: 0 
    },
    extraTimeMinutes: {
        type: Number,
        default: 0
    },
    cheatFlags: {
        type: Number,
        default: 0
    },
    flags: {
        type: [String],
        default: []
    },
    tabSwitches: {
        type: Number,
        default: 0
    },
    forceExited: {
        type: Boolean,
        default: false
    },
    disqualificationReason: {
        type: String,
        default: null
    },
    manualScores: [
        {
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
            adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            score: { type: Number, default: 0 },
            rubricScores: [{
                criterion: { type: String, required: true },
                score: { type: Number, required: true }
            }],
            feedback: { type: String, default: '' },
            evaluatedAt: { type: Date, default: Date.now }
        }
    ],
    assignedQuestions: [
        { type: mongoose.Schema.Types.ObjectId, ref: 'Question' }
    ],
    conductedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    hasCertificate: {
        type: Boolean,
        default: false
    },
    attemptNumber: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Allow multiple attempts for practice rounds, but uniquely identified by attempt number
practiceSubmissionSchema.index({ student: 1, round: 1, attemptNumber: 1 }, { unique: true });

module.exports = mongoose.model('PracticeSubmission', practiceSubmissionSchema);
