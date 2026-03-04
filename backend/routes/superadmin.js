const Question = require('../models/Question');
const Submission = require('../models/Submission');
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { logActivity } = require('../utils/logger');

module.exports = async function (fastify, opts) {

    /**
     * POST /api/superadmin/rounds
     * Super Admin can create new Rounds/Tests dynamically
     */
    fastify.post('/rounds', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { name, description, durationMinutes, type } = request.body;

            if (!name) return reply.code(400).send({ error: 'Round name is required' });

            const round = new Round({
                name,
                description: description || '',
                durationMinutes: durationMinutes || 60,
                status: 'LOCKED',
                isOtpActive: false,
                type: type || 'GENERAL'
            });

            await round.save();

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: round._id, label: round.name },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: round });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create round' });
        }
    });

    /**
     * 1. GET /api/superadmin/audit-logs
     * Returns all submissions across all rounds, enriched with student + round info.
     */
    fastify.get('/audit-logs', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.query;
            const filter = roundId ? { round: roundId } : {};

            const submissions = await Submission.find(filter)
                .populate('student', 'studentId name role')
                .populate('round', 'name status')
                .sort({ createdAt: -1 });

            return reply.code(200).send({ success: true, data: submissions });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch audit logs' });
        }
    });

    /**
     * 1b. GET /api/superadmin/activity-logs
     * Returns platform activity logs (login, logout, create, update, delete, etc.)
     */
    fastify.get('/activity-logs', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { action, limit = 200 } = request.query;
            const filter = action ? { action } : {};

            const logs = await ActivityLog.find(filter)
                .sort({ createdAt: -1 })
                .limit(Number(limit));

            return reply.code(200).send({ success: true, data: logs });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch activity logs' });
        }
    });

    /**
     * 2. GET /api/superadmin/rounds
     * Returns all rounds (for filter dropdown in audit logs and question manager).
     */
    fastify.get('/rounds', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const rounds = await Round.find({}).sort({ createdAt: 1 });
            return reply.code(200).send({ success: true, data: rounds });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch rounds' });
        }
    });

    /**
     * 2b. PATCH /api/superadmin/rounds/:roundId/question-settings
     * Update questionCount and shuffleQuestions for a round.
     * Clears previously assigned question sets so the new config takes effect.
     */
    fastify.patch('/rounds/:roundId/question-settings', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { questionCount, shuffleQuestions } = request.body;

            const updateFields = {};
            if (questionCount !== undefined) updateFields.questionCount = questionCount === '' ? null : Number(questionCount) || null;
            if (shuffleQuestions !== undefined) updateFields.shuffleQuestions = Boolean(shuffleQuestions);

            const round = await Round.findByIdAndUpdate(roundId, updateFields, { new: true });
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            // Clear previously assigned question sets so students get re-assigned on next load
            await Submission.updateMany({ round: roundId }, { $set: { assignedQuestions: [] } });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `${round.name} question settings` },
                metadata: { questionCount: round.questionCount, shuffleQuestions: round.shuffleQuestions },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: round });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update question settings' });
        }
    });


    /**
     * 3. GET /api/superadmin/questions/:roundId
     * Returns all questions for a given round.
     */
    fastify.get('/questions/:roundId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const questions = await Question.find({ round: roundId }).sort({ order: 1, createdAt: 1 });
            return reply.code(200).send({ success: true, data: questions });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch questions' });
        }
    });

    /**
     * 4. POST /api/superadmin/questions/:roundId
     * Create a new question for a round.
     */
    fastify.post('/questions/:roundId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const {
                title, description, inputFormat, outputFormat,
                sampleInput, sampleOutput, difficulty, points,
                order, type, category, options, correctAnswer,
                isManualEvaluation, assignedAdmin
            } = request.body;

            if (!title || !description) {
                return reply.code(400).send({ error: 'Title and description are required' });
            }

            if (isManualEvaluation && !assignedAdmin) {
                return reply.code(400).send({ error: 'A question marked for manual evaluation must be assigned to an admin' });
            }

            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            const question = new Question({
                round: roundId,
                title, description,
                inputFormat: inputFormat || '',
                outputFormat: outputFormat || '',
                sampleInput: sampleInput || '',
                sampleOutput: sampleOutput || '',
                difficulty: difficulty || 'MEDIUM',
                points: points || 10,
                order: order || 0,
                type: type || 'CODE',
                category: category || 'GENERAL',
                options: options || [],
                correctAnswer: correctAnswer || '',
                isManualEvaluation: isManualEvaluation || false,
                assignedAdmin: isManualEvaluation ? assignedAdmin : null
            });

            await question.save();

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', id: question._id.toString(), label: question.title },
                metadata: { roundId },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: question });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create question' });
        }
    });

    /**
     * 5. PUT /api/superadmin/questions/:questionId
     * Update an existing question.
     */
    fastify.put('/questions/:questionId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { questionId } = request.params;
            const updates = request.body;

            // If turning off manual evaluation, clear the assigned admin
            if (updates.isManualEvaluation === false) {
                updates.assignedAdmin = null;
            }
            // If manual evaluation is on, ensure an admin is assigned
            if (updates.isManualEvaluation === true && !updates.assignedAdmin) {
                return reply.code(400).send({ error: 'A question marked for manual evaluation must be assigned to an admin' });
            }

            const question = await Question.findByIdAndUpdate(questionId, updates, { new: true, runValidators: true });
            if (!question) return reply.code(404).send({ error: 'Question not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', id: questionId, label: question.title },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: question });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update question' });
        }
    });

    /**
     * GET /api/superadmin/manual-evaluations
     * Returns all submissions that have answers for questions assigned to this admin for manual evaluation.
     * Each entry contains: question info, student info, their answer, and existing manualScores.
     */
    fastify.get('/manual-evaluations', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const mongoose = require('mongoose');
            const adminId = request.user.userId;

            // Find all questions assigned to this admin for manual evaluation
            const questions = await Question.find({ isManualEvaluation: true, assignedAdmin: adminId })
                .populate('round', 'name')
                .lean();

            if (questions.length === 0) {
                return reply.code(200).send({ success: true, data: [] });
            }

            // Collect unique round ObjectIds (must be ObjectId instances, not strings, for $in to work)
            const roundObjectIds = [
                ...new Map(questions.map(q => [q.round._id.toString(), q.round._id])).values()
            ];

            // Find all submissions for those rounds (any status - autosaved answers count too)
            const submissions = await Submission.find({ round: { $in: roundObjectIds } })
                .populate('student', 'studentId name')
                .lean();

            // Build result: for each question, list all students and their answer + score
            const result = questions.map(question => {
                const qRoundId = question.round._id.toString();

                const students = submissions
                    .filter(sub => sub.round.toString() === qRoundId)
                    .map(sub => {
                        // Parse the student's answer for this specific question from codeContent JSON
                        // CodeArena stores: { [questionId]: answerString, ... }
                        let answer = null;
                        try {
                            const parsed = JSON.parse(sub.codeContent || '{}');
                            const rawAnswer = parsed[question._id.toString()];
                            answer = rawAnswer !== undefined ? rawAnswer : null;
                        } catch (_) {
                            // Fallback: codeContent is a plain string (older format)
                            answer = sub.codeContent || null;
                        }

                        // Check if a manual score already exists for this question in this submission
                        const existingScore = (sub.manualScores || []).find(
                            ms => ms.questionId && ms.questionId.toString() === question._id.toString()
                        );

                        return {
                            submissionId: sub._id,
                            student: sub.student,
                            submissionStatus: sub.status,
                            answer,
                            existingScore: existingScore || null
                        };
                    });

                return {
                    question: {
                        _id: question._id,
                        title: question.title,
                        description: question.description,
                        points: question.points,
                        type: question.type,
                        round: question.round
                    },
                    students
                };
            });

            return reply.code(200).send({ success: true, data: result });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch manual evaluations' });
        }
    });

    /**
     * POST /api/superadmin/manual-evaluations/:submissionId/score
     * Admin submits or updates a manual score for a specific question in a student's submission.
     * Body: { questionId, score, feedback }
     */
    fastify.post('/manual-evaluations/:submissionId/score', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { submissionId } = request.params;
            const { questionId, score, feedback } = request.body;
            const adminId = request.user.userId;

            if (!questionId || score === undefined) {
                return reply.code(400).send({ error: 'questionId and score are required' });
            }

            // Verify the question is actually assigned to this admin
            const question = await Question.findOne({ _id: questionId, isManualEvaluation: true, assignedAdmin: adminId });
            if (!question) {
                return reply.code(403).send({ error: 'You are not authorized to evaluate this question' });
            }

            const submission = await Submission.findById(submissionId);
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            // Upsert the manual score entry for this question
            const existingIndex = submission.manualScores.findIndex(
                ms => ms.questionId && ms.questionId.toString() === questionId.toString()
            );

            if (existingIndex >= 0) {
                submission.manualScores[existingIndex].score = score;
                submission.manualScores[existingIndex].feedback = feedback || '';
                submission.manualScores[existingIndex].evaluatedAt = new Date();
                submission.manualScores[existingIndex].adminId = adminId;
            } else {
                submission.manualScores.push({
                    questionId,
                    adminId,
                    score,
                    feedback: feedback || '',
                    evaluatedAt: new Date()
                });
            }

            // Recalculate total score as sum of all manual scores
            const totalManualScore = submission.manualScores.reduce((sum, ms) => sum + (ms.score || 0), 0);
            submission.score = totalManualScore;

            await submission.save();

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Submission', id: submissionId, label: `Manual score for question ${questionId}` },
                metadata: { questionId, score, feedback },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: { score: submission.score, manualScores: submission.manualScores } });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to save evaluation score' });
        }
    });

    /**
     * GET /api/superadmin/student-scores
     * Returns per-student score summary: overall total, per-round scores, and day-wise breakdown.
     */
    fastify.get('/student-scores', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            // Fetch all submissions that have been evaluated (manualScores not empty)
            const submissions = await Submission.find({ 'manualScores.0': { $exists: true } })
                .populate('student', 'studentId name')
                .populate('round', 'name')
                .lean();

            // Also include submissions with a numeric score (auto-scored)
            const allSubmissions = await Submission.find({
                $or: [
                    { 'manualScores.0': { $exists: true } },
                    { score: { $ne: null } }
                ]
            })
                .populate('student', 'studentId name')
                .populate('round', 'name')
                .lean();

            // Build per-student map
            const studentMap = {};

            for (const sub of allSubmissions) {
                if (!sub.student) continue;
                const sid = sub.student._id.toString();

                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        student: sub.student,
                        totalScore: 0,
                        rounds: [],       // [{ roundName, score, evaluatedAt }]
                        dayWise: {}       // { 'YYYY-MM-DD': totalScoreForDay }
                    };
                }

                const entry = studentMap[sid];

                // Sum manual scores for this submission
                const manualTotal = (sub.manualScores || []).reduce((s, ms) => s + (ms.score || 0), 0);
                const submissionScore = manualTotal > 0 ? manualTotal : (sub.score || 0);

                entry.totalScore += submissionScore;
                entry.rounds.push({
                    roundId: sub.round?._id,
                    roundName: sub.round?.name || 'Unknown Round',
                    score: submissionScore,
                    status: sub.status,
                    evaluatedAt: sub.updatedAt
                });

                // Build day-wise: use the latest evaluatedAt from manualScores, fallback to updatedAt
                const evalDates = (sub.manualScores || []).map(ms => ms.evaluatedAt).filter(Boolean);
                const dates = evalDates.length > 0 ? evalDates : [sub.updatedAt];

                for (const d of dates) {
                    if (!d) continue;
                    const dayKey = new Date(d).toISOString().slice(0, 10); // YYYY-MM-DD
                    entry.dayWise[dayKey] = (entry.dayWise[dayKey] || 0) + submissionScore;
                }
            }

            // Convert to sorted array, highest scorer first
            const result = Object.values(studentMap)
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((entry, rank) => ({
                    rank: rank + 1,
                    student: entry.student,
                    totalScore: entry.totalScore,
                    rounds: entry.rounds,
                    dayWise: Object.entries(entry.dayWise)
                        .map(([date, score]) => ({ date, score }))
                        .sort((a, b) => a.date.localeCompare(b.date))
                }));

            return reply.code(200).send({ success: true, data: result });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch student scores' });
        }
    });

    /**
     * 6. DELETE /api/superadmin/questions/:questionId
     * Delete a question permanently.
     */
    fastify.delete('/questions/:questionId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { questionId } = request.params;
            const question = await Question.findByIdAndDelete(questionId);
            if (!question) return reply.code(404).send({ error: 'Question not found' });

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', id: questionId, label: question.title },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Question deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete question' });
        }
    });

    /**
     * ADMIN MANAGEMENT — all routes below are SUPER_ADMIN only
     */

    // GET /api/superadmin/admins — list all ADMIN users
    fastify.get('/admins', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const admins = await User.find({ role: 'ADMIN' })
                .select('studentId name isBanned tokenIssuedAfter createdAt')
                .sort({ createdAt: -1 });
            return reply.code(200).send({ success: true, data: admins });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch admins' });
        }
    });

    // POST /api/superadmin/admins — create a new ADMIN
    fastify.post('/admins', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const bcrypt = require('bcryptjs');
            const { studentId, name, password } = request.body;
            if (!studentId || !name || !password) {
                return reply.code(400).send({ error: 'studentId, name, and password are required' });
            }
            const exists = await User.findOne({ studentId });
            if (exists) return reply.code(409).send({ error: 'User with this ID already exists' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const admin = new User({ studentId, name, password: hashedPassword, role: 'ADMIN' });
            await admin.save();

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', id: admin._id.toString(), label: `${admin.studentId} (${admin.name})` },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: { _id: admin._id, studentId: admin.studentId, name: admin.name } });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create admin' });
        }
    });

    // DELETE /api/superadmin/admins/:adminId — remove an ADMIN permanently
    fastify.delete('/admins/:adminId', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { adminId } = request.params;
            const admin = await User.findOneAndDelete({ _id: adminId, role: 'ADMIN' });
            if (!admin) return reply.code(404).send({ error: 'Admin not found' });

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', id: adminId, label: `${admin.studentId} (${admin.name})` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Admin removed successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to remove admin' });
        }
    });

    // PATCH /api/superadmin/admins/:adminId/block — toggle block/unblock an ADMIN
    fastify.patch('/admins/:adminId/block', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { adminId } = request.params;
            const admin = await User.findOne({ _id: adminId, role: 'ADMIN' });
            if (!admin) return reply.code(404).send({ error: 'Admin not found' });

            admin.isBanned = !admin.isBanned;
            // Force logout on block
            if (admin.isBanned) admin.tokenIssuedAfter = new Date();
            await admin.save();

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', id: adminId, label: `${admin.studentId} — ${admin.isBanned ? 'BLOCKED' : 'UNBLOCKED'}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, isBanned: admin.isBanned });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to toggle block status' });
        }
    });

    // PATCH /api/superadmin/admins/:adminId/force-logout — invalidate all existing sessions
    fastify.patch('/admins/:adminId/force-logout', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { adminId } = request.params;
            const admin = await User.findOneAndUpdate(
                { _id: adminId, role: 'ADMIN' },
                { tokenIssuedAfter: new Date() },
                { new: true }
            );
            if (!admin) return reply.code(404).send({ error: 'Admin not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', id: adminId, label: `${admin.studentId} — FORCE LOGOUT` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Admin has been force logged out' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to force logout admin' });
        }
    });

    // PATCH /api/superadmin/admins/:adminId/reset-password — set a new password for an admin
    fastify.patch('/admins/:adminId/reset-password', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const bcrypt = require('bcryptjs');
            const { adminId } = request.params;
            const { newPassword } = request.body;
            if (!newPassword || newPassword.length < 6) {
                return reply.code(400).send({ error: 'New password must be at least 6 characters' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            // Also force logout so the old password sessions die
            const admin = await User.findOneAndUpdate(
                { _id: adminId, role: 'ADMIN' },
                { password: hashedPassword, tokenIssuedAfter: new Date() },
                { new: true }
            );
            if (!admin) return reply.code(404).send({ error: 'Admin not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', id: adminId, label: `${admin.studentId} — PASSWORD RESET` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Password reset successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to reset password' });
        }
    });

    /**
     * STUDENT MANAGEMENT — all routes below are SUPER_ADMIN only
     */

    // GET /api/superadmin/students — list all STUDENT users
    fastify.get('/students', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { search = '' } = request.query;
            const filter = { role: 'STUDENT' };
            if (search) {
                filter.$or = [
                    { studentId: { $regex: search, $options: 'i' } },
                    { name: { $regex: search, $options: 'i' } }
                ];
            }
            const students = await User.find(filter)
                .select('studentId name isBanned tokenIssuedAfter createdAt')
                .sort({ createdAt: -1 })
                .limit(200);
            return reply.code(200).send({ success: true, data: students });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch students' });
        }
    });

    // POST /api/superadmin/students — create a new STUDENT
    fastify.post('/students', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const bcrypt = require('bcryptjs');
            const { studentId } = request.body;
            if (!studentId) {
                return reply.code(400).send({ error: 'studentId is required' });
            }
            const exists = await User.findOne({ studentId });
            if (exists) return reply.code(409).send({ error: 'User with this ID already exists' });

            const defaultPassword = '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            const student = new User({
                studentId,
                name: `Student ${studentId}`,
                password: hashedPassword,
                role: 'STUDENT',
                isOnboarded: false
            });
            await student.save();

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: student._id.toString(), label: `${student.studentId}` },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: { _id: student._id, studentId: student.studentId, name: student.name } });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create student' });
        }
    });

    // DELETE /api/superadmin/students/:studentId — remove a STUDENT permanently
    fastify.delete('/students/:studentId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { studentId } = request.params;
            const student = await User.findOneAndDelete({ _id: studentId, role: 'STUDENT' });
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: studentId, label: `${student.studentId} (${student.name})` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Student removed successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to remove student' });
        }
    });

    // PATCH /api/superadmin/students/:studentId/block — toggle block/unblock a STUDENT
    fastify.patch('/students/:studentId/block', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { studentId } = request.params;
            const student = await User.findOne({ _id: studentId, role: 'STUDENT' });
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            student.isBanned = !student.isBanned;

            if (student.isBanned) {
                student.tokenIssuedAfter = new Date(); // Invalidate current session
            } else {
                // Clear ban details when unblocking
                student.banReason = null;
                student.tokenIssuedAfter = null;
            }

            await student.save();

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: studentId, label: `${student.studentId} — ${student.isBanned ? 'BLOCKED' : 'UNBLOCKED'}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, isBanned: student.isBanned });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to toggle block status' });
        }
    });

    /**
     * DELETE /api/superadmin/submissions/:submissionId
     * Permanently deletes a student's submission record.
     */
    fastify.delete('/submissions/:submissionId', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { submissionId } = request.params;
            const submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            await Submission.findByIdAndDelete(submissionId);

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Submission', id: submissionId, label: `Deleted submission for ${submission.student?.name} (${submission.student?.studentId})` },
                ip: request.ip
            });

            return reply.send({ success: true, message: 'Submission deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete submission' });
        }
    });


    // PATCH /api/superadmin/students/:studentId/force-logout — invalidate all sessions
    fastify.patch('/students/:studentId/force-logout', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { studentId } = request.params;
            const student = await User.findOneAndUpdate(
                { _id: studentId, role: 'STUDENT' },
                { tokenIssuedAfter: new Date() },
                { new: true }
            );
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            await logActivity({
                action: 'LOGOUT',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: studentId, label: `${student.studentId} — FORCE LOGOUT` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Student has been force logged out' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to force logout student' });
        }
    });

    // PATCH /api/superadmin/students/:studentId/reset-password — reset a student's password
    fastify.patch('/students/:studentId/reset-password', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const bcrypt = require('bcryptjs');
            const { studentId } = request.params;
            const { newPassword } = request.body;
            if (!newPassword || newPassword.length < 6) {
                return reply.code(400).send({ error: 'New password must be at least 6 characters' });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            const student = await User.findOneAndUpdate(
                { _id: studentId, role: 'STUDENT' },
                { password: hashedPassword, tokenIssuedAfter: new Date() },
                { new: true }
            );
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: studentId, label: `${student.studentId} — PASSWORD RESET` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Password reset successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to reset password' });
        }
    });

    /**
     * POST /api/superadmin/rounds/:roundId/generate-otp
     * Allows SuperAdmin to generate Start/End OTPs and unlock a round.
     */
    fastify.post('/rounds/:roundId/generate-otp', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;
        try {
            const crypto = require('crypto');
            const startOtp = crypto.randomInt(100000, 999999).toString();
            const endOtp = crypto.randomInt(100000, 999999).toString();

            const round = await Round.findByIdAndUpdate(
                roundId,
                { startOtp, endOtp, status: 'WAITING_FOR_OTP', isOtpActive: true },
                { new: true }
            );
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            await logActivity({
                action: 'OTP_GENERATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });
            return reply.send({ success: true, data: round });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate OTPs' });
        }
    });

    /**
     * PATCH /api/superadmin/rounds/:roundId/status
     * Allows SuperAdmin to Force End a round, pause, etc.
     */
    fastify.patch('/rounds/:roundId/status', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;
        const { status, isOtpActive, durationMinutes } = request.body;

        try {
            const updates = {};
            if (status) updates.status = status;
            if (isOtpActive !== undefined) updates.isOtpActive = isOtpActive;
            if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;

            const round = await Round.findByIdAndUpdate(roundId, updates, { new: true });
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });
            return reply.send({ success: true, data: round });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update round status' });
        }
    });
    /**
     * DELETE /api/superadmin/rounds/:roundId
     * Deletes a round and its associated questions/submissions.
     */
    fastify.delete('/rounds/:roundId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;
        try {
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            // Delete associated questions and submissions to maintain integrity
            await Question.deleteMany({ round: roundId });
            await Submission.deleteMany({ round: roundId });

            await Round.findByIdAndDelete(roundId);

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round.name },
                ip: request.ip
            });

            return reply.send({ success: true, message: 'Round and its data deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete round' });
        }
    });

};
