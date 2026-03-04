const crypto = require('crypto');
const mongoose = require('mongoose');
const Round = require('../models/Round');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { logActivity } = require('../utils/logger');

// Helper to generate a secure 6-digit OTP
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

module.exports = async function (fastify, opts) {
    /**
     * 0. List All Rounds (GET /api/rounds)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.get('/', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const rounds = await Round.find({}).sort({ createdAt: -1 }).lean();
            const studentId = request.user.userId;

            // Enrich rounds with the student's submission status
            const enrichedRounds = await Promise.all(rounds.map(async (round) => {
                const submission = await Submission.findOne({ student: studentId, round: round._id }).select('status');
                return {
                    ...round,
                    mySubmissionStatus: submission ? submission.status : null
                };
            }));

            return reply.code(200).send({ success: true, data: enrichedRounds });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch rounds' });
        }
    });

    /**
     * 1a. GET /api/rounds/:roundId/refresh-otp
     * Auto-rotates OTPs every 60s. Admin UI polls this every ~5s to show live countdown.
     * Auth: requireAdmin
     */
    fastify.get('/:roundId/refresh-otp', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;

        try {
            let round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            const OTP_TTL_MS = 60 * 1000; // 1 minute
            const now = new Date();
            const issuedAt = round.otpIssuedAt ? new Date(round.otpIssuedAt) : null;
            const age = issuedAt ? now - issuedAt : Infinity;

            // Auto-rotate if OTP is expired or was never issued
            if (!round.startOtp || !round.endOtp || age >= OTP_TTL_MS) {
                const startOtp = generateOtp();
                const endOtp = generateOtp();
                round = await Round.findByIdAndUpdate(
                    roundId,
                    { startOtp, endOtp, otpIssuedAt: now },
                    { new: true }
                );
            }

            const freshIssuedAt = new Date(round.otpIssuedAt);
            const expiresAt = new Date(freshIssuedAt.getTime() + OTP_TTL_MS);
            const secondsLeft = Math.max(0, Math.ceil((expiresAt - new Date()) / 1000));

            return reply.code(200).send({
                success: true,
                data: {
                    startOtp: round.startOtp,
                    endOtp: round.endOtp,
                    otpIssuedAt: round.otpIssuedAt,
                    expiresAt,
                    secondsLeft
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to refresh OTP' });
        }
    });

    /**
     * 1. Admin OTP Generation (POST /api/rounds/:roundId/generate-otp)
     * Auth: Must use the requireAdmin hook.
     */
    fastify.post('/:roundId/generate-otp', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;

        try {
            const startOtp = generateOtp();
            const endOtp = generateOtp();

            const round = await Round.findByIdAndUpdate(
                roundId,
                { startOtp, endOtp, otpIssuedAt: new Date(), status: 'WAITING_FOR_OTP', isOtpActive: true },
                { new: true }
            );

            if (!round) {
                return reply.code(404).send({ error: 'Round not found' });
            }

            // Log OTP generation
            await logActivity({
                action: 'OTP_GENERATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: 'OTPs generated successfully',
                data: {
                    roundName: round.name,
                    startOtp: round.startOtp,
                    endOtp: round.endOtp
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate OTPs' });
        }
    });

    /**
     * 2. Student Start Round Gate (POST /api/rounds/:roundId/start)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.post('/:roundId/start', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const { startOtp } = request.body;
        const studentId = request.user.userId;

        if (!startOtp) {
            return reply.code(400).send({ error: 'startOtp is required' });
        }

        try {
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            if (round.status === 'LOCKED' || !round.isOtpActive) {
                return reply.code(403).send({ error: 'Round is currently locked by admin' });
            }

            if (round.startOtp !== startOtp) {
                return reply.code(401).send({ error: 'Invalid Start OTP' });
            }

            // Check if student already has a submission for this round
            let submission = await Submission.findOne({ student: studentId, round: roundId });

            if (submission) {
                if (submission.status === 'SUBMITTED' || submission.status === 'DISQUALIFIED') {
                    return reply.code(403).send({ error: 'You have already completed or been disqualified from this round' });
                }
                // If IN_PROGRESS, they might be resuming after a crash. We just return the existing start time.
                return reply.code(200).send({
                    success: true,
                    message: 'Round resumed successfully',
                    startTime: submission.startTime
                });
            }

            // Create new submission tracking record
            submission = new Submission({
                student: studentId,
                round: roundId,
                status: 'IN_PROGRESS',
                startTime: new Date()
            });

            await submission.save();

            // Log round start
            await logActivity({
                action: 'ROUND_STARTED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: 'Round unlocked successfully',
                startTime: submission.startTime,
                durationMinutes: round.durationMinutes
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to start round' });
        }
    });

    /**
     * 3. Student End Round Gate (POST /api/rounds/:roundId/submit)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.post('/:roundId/submit', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const { endOtp, codeContent, pdfUrl, answers } = request.body;
        const studentId = request.user.userId;

        if (!endOtp) {
            return reply.code(400).send({ error: 'endOtp is required' });
        }

        try {
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            if (round.endOtp !== endOtp) {
                return reply.code(401).send({ error: 'Invalid End OTP' });
            }

            const submission = await Submission.findOne({ student: studentId, round: roundId });
            if (!submission) {
                return reply.code(400).send({ error: 'No active session found for this round' });
            }

            if (submission.status === 'SUBMITTED') {
                return reply.code(400).send({ error: 'Round already submitted' });
            }

            // Enforce the 1-hour time limit (+ 2 min buffer for network latency)
            const now = new Date();
            const elapsedMinutes = (now - new Date(submission.startTime)) / 1000 / 60;
            const bufferedDuration = round.durationMinutes + 2;

            if (elapsedMinutes > bufferedDuration) {
                // Automatically disqualify for timing out completely and skipping front-end guards
                submission.status = 'DISQUALIFIED';
                submission.disqualificationReason = 'Submission timed out beyond server limits';
                submission.endTime = now;
                await submission.save();
                return reply.code(403).send({ error: 'Time limit exceeded. Disqualified.' });
            }

            // Successful Submission
            submission.status = 'SUBMITTED';
            submission.endTime = now;
            if (answers) {
                submission.codeContent = typeof answers === 'object' ? JSON.stringify(answers) : answers;
            } else if (codeContent) {
                submission.codeContent = codeContent;
            }
            if (pdfUrl) submission.pdfUrl = pdfUrl;

            await submission.save();

            // Log round submission
            await logActivity({
                action: 'ROUND_SUBMITTED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: 'Round successfully submitted'
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to submit round' });
        }
    });

    /**
     * 7. Report Anti-Cheat Violation (POST /api/rounds/:roundId/report-cheat)
     * Auth: Student
     */
    fastify.post('/:roundId/report-cheat', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const { type, count } = request.body;
        const userId = request.user.userId;

        if (!mongoose.Types.ObjectId.isValid(roundId)) {
            return reply.code(400).send({ error: 'Invalid Round ID' });
        }

        try {
            const submission = await Submission.findOne({ student: userId, round: roundId });
            if (!submission) return reply.code(404).send({ error: 'Submission session not found' });

            const user = await User.findById(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });

            if (type === 'TAB_SWITCH') {
                submission.tabSwitches = Math.max(submission.tabSwitches, count || 0);
            } else if (type === 'CHEAT_FLAG') {
                submission.cheatFlags += 1;
            }

            let shouldBan = false;
            let reason = '';

            // Using >= 1 for immediate disqualification as requested
            if (submission.tabSwitches >= 1) {
                shouldBan = true;
                reason = 'Anti-cheat threshold (Tab Switch) exceeded.';
            } else if (submission.cheatFlags >= 1) {
                shouldBan = true;
                reason = 'Anti-cheat threshold (Copy-Paste detected) exceeded.';
            }

            if (shouldBan) {
                user.isBanned = true;
                user.banReason = reason;
                user.tokenIssuedAfter = new Date(); // Invalidate current session
                submission.status = 'DISQUALIFIED';
                submission.disqualificationReason = reason;
                await user.save();
            }

            await submission.save();

            // Log the violation
            await logActivity({
                action: 'CHEAT_DETECTED',
                performedBy: { userId, studentId: request.user.studentId, name: request.user.name, role: request.user.role },
                target: { type: 'Submission', id: submission._id, label: `${type} flag recorded` },
                metadata: { type, count: submission.tabSwitches, flags: submission.cheatFlags, banned: shouldBan },
                ip: request.ip
            });

            return reply.send({
                success: true,
                banned: shouldBan,
                reason,
                tabSwitches: submission.tabSwitches,
                cheatFlags: submission.cheatFlags
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Security protocol failed to record violation' });
        }
    });

    /**
     * 4. Get Round Questions for Student (GET /api/rounds/:roundId/questions)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.get('/:roundId/questions', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const studentId = request.user.userId;

        if (!mongoose.Types.ObjectId.isValid(roundId)) {
            return reply.code(404).send({ error: 'Invalid Round ID format' });
        }

        try {
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            const submission = await Submission.findOne({ student: studentId, round: roundId });

            if (!submission) {
                return reply.code(403).send({ error: 'Access denied. You must start the round first.' });
            }

            if (submission.status === 'DISQUALIFIED') {
                return reply.code(403).send({ error: 'ACCESS REVOKED: You have been disqualified for violating security protocols.' });
            }

            if (submission.status !== 'IN_PROGRESS' && submission.status !== 'SUBMITTED') {
                return reply.code(403).send({ error: 'Access denied. Round session is not active.' });
            }

            const Question = require('../models/Question');
            let assignedQuestions;

            if (submission.assignedQuestions && submission.assignedQuestions.length > 0) {
                // Student already has an assigned set — return it in the saved order
                const qMap = {};
                const allQ = await Question.find({ _id: { $in: submission.assignedQuestions } });
                allQ.forEach(q => { qMap[q._id.toString()] = q; });
                assignedQuestions = submission.assignedQuestions
                    .map(id => qMap[id.toString()])
                    .filter(Boolean);
            } else {
                // First load: build and persist the student's question set
                const allQuestions = await Question.find({ round: roundId }).sort({ order: 1 });
                let selected = [...allQuestions];

                // Fisher-Yates shuffle seeded by student ID (consistent per student)
                if (round.shuffleQuestions !== false) {
                    const seed = studentId.toString();
                    let h = 0;
                    for (let i = 0; i < seed.length; i++) {
                        h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
                    }
                    const rand = () => {
                        h ^= h << 13; h ^= h >> 17; h ^= h << 5;
                        return (h >>> 0) / 4294967296;
                    };
                    for (let i = selected.length - 1; i > 0; i--) {
                        const j = Math.floor(rand() * (i + 1));
                        [selected[i], selected[j]] = [selected[j], selected[i]];
                    }
                }

                // Trim to questionCount if set
                if (round.questionCount && round.questionCount > 0 && round.questionCount < selected.length) {
                    selected = selected.slice(0, round.questionCount);
                }

                // Persist the assignment so reconnects return the same set
                submission.assignedQuestions = selected.map(q => q._id);
                await submission.save();
                assignedQuestions = selected;
            }

            // Count total rounds so student can see "Round X of Y"
            const totalRounds = await Round.countDocuments({});
            const allRounds = await Round.find({}, '_id').sort({ createdAt: 1 }).lean();
            const roundNumber = allRounds.findIndex(r => r._id.toString() === roundId) + 1;

            return reply.code(200).send({
                success: true,
                data: {
                    round: {
                        name: round.name,
                        type: round.type,
                        durationMinutes: round.durationMinutes,
                        status: round.status,
                        startTime: submission.startTime,
                        totalRounds,
                        roundNumber
                    },
                    questions: assignedQuestions.map(q => ({
                        _id: q._id,
                        title: q.title,
                        description: q.description,
                        inputFormat: q.inputFormat,
                        outputFormat: q.outputFormat,
                        sampleInput: q.sampleInput,
                        sampleOutput: q.sampleOutput,
                        difficulty: q.difficulty,
                        points: q.points,
                        type: q.type,
                        category: q.category,
                        options: q.options
                    }))
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch round questions' });
        }
    });

    /**
     * 5. Auto-Save Draft (POST /api/rounds/:roundId/autosave)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.post('/:roundId/autosave', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const { codeContent, answers } = request.body;
        const studentId = request.user.userId;

        try {
            const submission = await Submission.findOne({ student: studentId, round: roundId });
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            if (submission.status !== 'IN_PROGRESS') {
                // Silently return success to avoid noisy frontend errors once the session is done
                return reply.code(200).send({ success: true, message: 'Session no longer active' });
            }

            if (answers) {
                submission.codeContent = typeof answers === 'object' ? JSON.stringify(answers) : answers;
            } else if (codeContent !== undefined) {
                submission.codeContent = codeContent;
            }

            await submission.save();
            return reply.code(200).send({ success: true });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to autosave' });
        }
    });
};
