'use strict';

const Submission = require('../models/Submission');
const Round = require('../models/Round');

// ─── Task 3: Background Ranking Cache ─────────────────────────────────────────
// Prevents hitting Atlas on every student request during high-concurrency spikes.
let rankingCache = {
    data: null,      // Array of { id, totalScore, rank }
    lastFetched: 0,
    TTL: 5 * 60 * 1000, // 5 minutes
    isFetching: false
};

/**
 * hydrateRankingCache()
 * Performs a lean aggregation of all student scores and caches the results.
 * Called at boot time and periodically.
 */
async function hydrateRankingCache() {
    if (rankingCache.isFetching) return;
    
    rankingCache.isFetching = true;
    try {
        const now = Date.now();
        // Sum up pre-computed scores across all rounds/submissions
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
        console.info(`[RankingCache] Hydrated ${rankedResults.length} students into global leaderboard cache.`);
    } catch (err) {
        console.error('[RankingCache] Hydration failed:', err.message);
    } finally {
        rankingCache.isFetching = false;
    }
}

/**
 * getStudentRank(studentObjectId)
 * Returns the latest known rank for a student from memory.
 */
async function getStudentRank(studentObjectId) {
    const now = Date.now();
    const sid = studentObjectId.toString();

    // Trigger background refresh if expired, but don't block the current request
    if (now - rankingCache.lastFetched > rankingCache.TTL) {
        hydrateRankingCache();
    }

    if (!rankingCache.data) return 9999; // Default for unranked during first boot if slow

    const found = rankingCache.data.find(s => s.id === sid);
    return found ? found.rank : rankingCache.data.length + 1;
}

function invalidateRankingCache() {
    rankingCache.data = null;
    rankingCache.lastFetched = 0;
}

/**
 * isStudentEligible(studentObjectId, roundId)
 * Checks if a student is eligible for a specific round.
 */
async function isStudentEligible(studentObjectId, roundId) {
    // Note: In high-concurrency routes like /api/rounds/, round should be 
    // passed as an object to avoid this extra DB hit.
    const Round = require('../models/Round');
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
    invalidateRankingCache,
    hydrateRankingCache
};
