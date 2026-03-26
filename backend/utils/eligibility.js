const Submission = require('../models/Submission');
const Round = require('../models/Round');

// In-memory cache for rankings — prevents hitting Atlas on every student request
let rankingCache = {
    data: null, // Array of { id, totalScore, rank }
    lastFetched: 0,
    TTL: 5 * 60 * 1000 // 5 minutes
};

/**
 * Calculates student rank based on total score across the platform.
 * Uses the pre-computed `score` field on Submission (set at grading time),
 * so no expensive per-doc $reduce needed.
 */
async function getStudentRank(studentObjectId) {
    const now = Date.now();

    // Return from cache if still fresh
    if (rankingCache.data && (now - rankingCache.lastFetched < rankingCache.TTL)) {
        const found = rankingCache.data.find(s => s.id === studentObjectId.toString());
        return found ? found.rank : rankingCache.data.length + 1;
    }

    // Lean 3-stage aggregation using the pre-computed score column
    const results = await Submission.aggregate([
        { $match: { score: { $gt: 0 } } },
        { $group: { _id: '$student', totalScore: { $sum: '$score' } } },
        { $sort: { totalScore: -1 } }
    ]);

    const rankedResults = results.map((r, index) => ({
        id: r._id ? r._id.toString() : 'unknown',
        totalScore: r.totalScore,
        rank: index + 1
    }));

    rankingCache.data = rankedResults;
    rankingCache.lastFetched = now;

    const found = rankedResults.find(s => s.id === studentObjectId.toString());
    return found ? found.rank : rankedResults.length + 1;
}

/**
 * Force clear the ranking cache (call after manual grading)
 */
function invalidateRankingCache() {
    rankingCache.data = null;
    rankingCache.lastFetched = 0;
}

/**
 * Checks if a student is eligible for a specific round.
 * NOTE: This still does a Round.findById — only use this in routes that haven't
 * already loaded the round. For the bulk /rounds endpoint, eligibility is
 * computed inline from the already-loaded round objects.
 */
async function isStudentEligible(studentObjectId, roundId) {
    const round = await Round.findById(roundId);
    if (!round) return { eligible: false, message: 'Round not found' };

    if (round.maxParticipants == null) {
        return { eligible: true };
    }

    if (round.allowedStudentIds && round.allowedStudentIds.some(id => id.toString() === studentObjectId.toString())) {
        return { eligible: true, reason: 'ADMIN_ALLOWED' };
    }

    const rank = await getStudentRank(studentObjectId);
    if (rank <= round.maxParticipants) {
        return { eligible: true, rank };
    }

    return {
        eligible: false,
        rank,
        maxRank: round.maxParticipants,
        message: `Eligibility restricted to top ${round.maxParticipants} students. Your current rank is #${rank}.`
    };
}

module.exports = {
    getStudentRank,
    isStudentEligible,
    invalidateRankingCache
};
