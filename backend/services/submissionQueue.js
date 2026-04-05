/**
 * submissionQueue.js
 * -------------------
 * Task 2: In-Memory Submission Queue (Batch Processing)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Submission = require('../models/Submission');
const PracticeSubmission = require('../models/PracticeSubmission');

// Path to the "lifeboat" dead letter log
const DEAD_LETTER_LOG = path.join(__dirname, '../failed_submissions.log');

// Helper to prevent JSON.stringify from crashing the server on circular refs/BigInts
function safeStringify(obj) {
    try {
        return JSON.stringify(obj);
    } catch (err) {
        return JSON.stringify({ error: 'Unserializable payload', reason: err.message, rawLength: Array.isArray(obj) ? obj.length : 1 });
    }
}

// ─── In-Memory Queues ──────────────────────────────────────────────────────────
const submissionQueue = [];
const practiceQueue = [];
let isFlushingSubmissions = false;
let isFlushingPractice = false;

// ─── Configuration ────────────────────────────────────────────────────────────
const FLUSH_INTERVAL_MS = 5 * 1000; // 5 seconds
const BATCH_SIZE = 50;              // Max docs per insertMany call

/**
 * enqueueSubmission(payload, isPractice)
 *  Push a validated submission payload onto the correct in-memory queue.
 */
function enqueueSubmission(payload, isPractice = false) {
    const queue = isPractice ? practiceQueue : submissionQueue;
    queue.push({
        ...payload,
        _enqueuedAt: Date.now()
    });
    return queue.length;
}

function getQueueLength() {
    return {
        submissions: submissionQueue.length,
        practice: practiceQueue.length
    };
}

/**
 * flushQueue()
 *  Drains up to BATCH_SIZE items from the front of the queue and persists
 *  them to MongoDB in a single insertMany call.
 */
async function flushSubmissions() {
    if (isFlushingSubmissions || submissionQueue.length === 0) return;
    isFlushingSubmissions = true;
    const batch = submissionQueue.splice(0, BATCH_SIZE);
    try {
        await Submission.insertMany(batch, { ordered: false, rawResult: true });
    } catch (err) {
        handleFlushError(err, batch, 'Submission');
    } finally {
        isFlushingSubmissions = false;
    }
}

async function flushPractice() {
    if (isFlushingPractice || practiceQueue.length === 0) return;
    isFlushingPractice = true;
    const batch = practiceQueue.splice(0, BATCH_SIZE);
    try {
        await PracticeSubmission.insertMany(batch, { ordered: false, rawResult: true });
    } catch (err) {
        handleFlushError(err, batch, 'PracticeSubmission');
    } finally {
        isFlushingPractice = false;
    }
}

function handleFlushError(err, batch, type) {
    if (err.name === 'MongoBulkWriteError' || err.code === 11000) {
        console.warn(`[SubmissionQueue] Partial ${type} batch insert: some duplicates were discarded.`);
    } else {
        console.error(`[SubmissionQueue] Unexpected ${type} flush error. Writing to dead letter log.`, err.message);
        try {
            const logEntry = { timestamp: new Date().toISOString(), type, error: err.message, batch };
            fs.appendFileSync(DEAD_LETTER_LOG, safeStringify(logEntry) + '\n', 'utf8');
        } catch (fsErr) {
            console.error(`[SubmissionQueue] CRITICAL: Could not write ${type} to dead letter log!`, fsErr.message);
        }
    }
}

function startSubmissionQueue() {
    console.info(`[SubmissionQueue] Background flush worker started (interval: ${FLUSH_INTERVAL_MS / 1000}s).`);
    setInterval(() => {
        flushSubmissions();
        flushPractice();
    }, FLUSH_INTERVAL_MS);
}

async function flushNow() {
    console.info(`[SubmissionQueue] flushNow: Draining all queues...`);
    
    // Drain Submissions
    while (submissionQueue.length > 0) {
        const batch = submissionQueue.splice(0, BATCH_SIZE);
        try { await Submission.insertMany(batch, { ordered: false }); } catch (e) {}
    }

    // Drain Practice
    while (practiceQueue.length > 0) {
        const batch = practiceQueue.splice(0, BATCH_SIZE);
        try { await PracticeSubmission.insertMany(batch, { ordered: false }); } catch (e) {}
    }
    
    console.info(`[SubmissionQueue] flushNow complete.`);
}

module.exports = {
    startSubmissionQueue,
    enqueueSubmission,
    getQueueLength,
    flushNow
};
