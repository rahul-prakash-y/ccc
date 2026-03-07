const Submission = require('../models/Submission');
const Round = require('../models/Round');

/**
 * Calculates student rank based on total score across the platform.
 * Reuses logic similar to StudentScoreDashboard.
 */
async function getStudentRank(studentObjectId) {
    // Fetch all submissions with scores
    const allSubmissions = await Submission.find({
        $or: [
            { 'manualScores.0': { $exists: true } },
            { score: { $ne: null } }
        ]
    }).select('student score autoScore manualScores');

    const studentMap = {};

    for (const sub of allSubmissions) {
        if (!sub.student) continue;
        const sid = sub.student.toString();

        if (!studentMap[sid]) {
            studentMap[sid] = { totalScore: 0 };
        }

        const manualTotal = (sub.manualScores || []).reduce((s, ms) => s + (ms.score || 0), 0);
        const submissionScore = (sub.autoScore || 0) + manualTotal;
        studentMap[sid].totalScore += submissionScore;
    }

    // Convert to sorted array
    const sortedStudents = Object.entries(studentMap)
        .map(([id, data]) => ({ id, totalScore: data.totalScore }))
        .sort((a, b) => b.totalScore - a.totalScore);

    // Find our student's index
    const rankIndex = sortedStudents.findIndex(s => s.id === studentObjectId.toString());

    // If student has no recorded scores, they are at the end
    return rankIndex === -1 ? sortedStudents.length + 1 : rankIndex + 1;
}

/**
 * Checks if a student is eligible for a specific round.
 */
async function isStudentEligible(studentObjectId, roundId) {
    const round = await Round.findById(roundId);
    if (!round) return { eligible: false, message: 'Round not found' };

    // 1. If no limit is set, everyone is eligible
    if (round.maxParticipants === null || round.maxParticipants === undefined) {
        return { eligible: true };
    }

    // 2. Check if student is manually whitelisted
    if (round.allowedStudentIds && round.allowedStudentIds.includes(studentObjectId)) {
        return { eligible: true, reason: 'ADMIN_ALLOWED' };
    }

    // 3. Check Rank
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
    isStudentEligible
};
