const crypto = require('crypto');
const Round = require('../models/Round');
const Submission = require('../models/Submission');
const { logActivity } = require('../utils/logger');

// Helper to generate a secure 6-digit OTP
const generateOtp = () => {
    return crypto.randomInt(100000, 999999).toString();
};

module.exports = async function (fastify, opts) {

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
                { startOtp, endOtp, status: 'WAITING_FOR_OTP', isOtpActive: true },
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
        const { endOtp, codeContent, pdfUrl } = request.body;
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
     * 4. Get Round Questions for Student (GET /api/rounds/:roundId/questions)
     * Auth: Must use the authenticate hook (Student).
     */
    fastify.get('/:roundId/questions', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const { roundId } = request.params;
        const studentId = request.user.userId;

        try {
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            const submission = await Submission.findOne({ student: studentId, round: roundId });
            if (!submission || (submission.status !== 'IN_PROGRESS' && submission.status !== 'SUBMITTED')) {
                return reply.code(403).send({ error: 'Access denied. You must start the round first.' });
            }

            const Question = require('../models/Question');
            const questions = await Question.find({ round: roundId }).sort({ order: 1 });

            return reply.code(200).send({
                success: true,
                data: {
                    round: {
                        name: round.name,
                        type: round.type,
                        durationMinutes: round.durationMinutes,
                        status: round.status
                    },
                    questions: questions.map(q => ({
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
                        options: q.options // Only sent if MCQ, but safe to include
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
                return reply.code(403).send({ error: 'Cannot autosave for a completed session' });
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
