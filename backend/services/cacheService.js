'use strict';

const Round = require('../models/Round');
const Question = require('../models/Question');

let globalRoundsCache = [];
let globalRoundsMap = {};
let globalQuestionsCache = {};
let globalQuestionsMap = {}; // Full data (includes correctAnswers)

/**
 * Hydrates the static data arrays (Rounds and Questions) from MongoDB to RAM.
 * Called securely at boot time to prevent high DB read connections from students.
 */
async function hydrateStaticData() {
    try {
        console.info('[CacheService] Hydrating static data to RAM...');

        // 1. Cache all rounds
        globalRoundsCache = await Round.find({})
            .select('-startOtp -endOtp -otpIssuedAt')
            .sort({ createdAt: -1 })
            .lean();

        globalRoundsMap = {};
        globalRoundsCache.forEach(r => globalRoundsMap[r._id.toString()] = r);

        // 2. Fetch all questions from the DB
        const questions = await Question.find({}).lean();
        
        globalQuestionsCache = {};
        globalQuestionsMap = {};

        questions.forEach(q => {
            // Populate the O(1) full global map (used for backend evaluations)
            globalQuestionsMap[q._id.toString()] = q;

            // Create a stripped version for the public cache (no correctAnswers)
            const strippedQ = { ...q };
            delete strippedQ.correctAnswer;
            
            // Map by primary round
            if (q.round) {
                const rId = q.round.toString();
                if (!globalQuestionsCache[rId]) {
                    globalQuestionsCache[rId] = [];
                }
                globalQuestionsCache[rId].push(strippedQ);
            }

            // Map by linkedRounds
            if (q.linkedRounds && q.linkedRounds.length > 0) {
                q.linkedRounds.forEach(rIdObj => {
                    const rId = rIdObj.toString();
                    if (!globalQuestionsCache[rId]) {
                        globalQuestionsCache[rId] = [];
                    }
                    globalQuestionsCache[rId].push(strippedQ);
                });
            }
        });
        
        // Deduplicate and sort the public cache
        for (const [rId, qs] of Object.entries(globalQuestionsCache)) {
            const uniqueQsMap = new Map();
            qs.forEach(q => uniqueQsMap.set(q._id.toString(), q));
            globalQuestionsCache[rId] = Array.from(uniqueQsMap.values()).sort((a,b) => a.order - b.order);
        }

        console.info(`[CacheService] Hydration complete. Cached ${globalRoundsCache.length} rounds. Questions cached in RAM.`);
    } catch (error) {
        console.error('[CacheService] Error hydrating static data:', error.message);
    }
}

function getRoundsCache() {
    return globalRoundsCache;
}

function getRoundById(roundId) {
    return globalRoundsMap[roundId.toString()] || null;
}

function getQuestionsByRound(roundId) {
    return globalQuestionsCache[roundId.toString()] || [];
}

function getFullQuestionById(questionId) {
    return globalQuestionsMap[questionId.toString()] || null;
}

module.exports = {
    hydrateStaticData,
    getRoundsCache,
    getRoundById,
    getQuestionsByRound,
    getFullQuestionById
};
