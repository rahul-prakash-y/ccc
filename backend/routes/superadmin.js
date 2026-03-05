const Question = require('../models/Question');
const Submission = require('../models/Submission');
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { logActivity } = require('../utils/logger');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

module.exports = async function (fastify, opts) {

    /**
     * POST /api/superadmin/rounds
     * Super Admin can create new Rounds/Tests dynamically
     */
    fastify.post('/rounds', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const {
                name, description, durationMinutes, type,
                questionCount, shuffleQuestions,
                testGroupId, testDurationMinutes, roundOrder
            } = request.body;

            if (!name) return reply.code(400).send({ error: 'Round name is required' });

            const round = new Round({
                name,
                description: description || '',
                durationMinutes: durationMinutes || 60,
                status: 'LOCKED',
                isOtpActive: false,
                type: type || 'GENERAL',
                questionCount: questionCount === undefined ? null : (questionCount === '' ? null : Number(questionCount)),
                shuffleQuestions: shuffleQuestions === undefined ? true : Boolean(shuffleQuestions),
                testGroupId: testGroupId || null,
                testDurationMinutes: testDurationMinutes || null,
                roundOrder: roundOrder || 1
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
            const { roundId, search, page = 1, limit = 20 } = request.query;

            let filter = {};
            if (roundId) filter.round = roundId;

            // If search is provided, we need to find students or rounds that match the search string
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                const [matchingStudents, matchingRounds] = await Promise.all([
                    User.find({
                        $or: [
                            { studentId: searchRegex },
                            { name: searchRegex }
                        ]
                    }).select('_id'),
                    Round.find({ name: searchRegex }).select('_id')
                ]);

                const studentIds = matchingStudents.map(s => s._id);
                const rIds = matchingRounds.map(r => r._id);

                filter.$or = [
                    { student: { $in: studentIds } },
                    { round: { $in: rIds } }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [submissions, total] = await Promise.all([
                Submission.find(filter)
                    .populate('student', 'studentId name role')
                    .populate('round', 'name status')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Submission.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: submissions,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
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
            const { action, search, page = 1, limit = 20 } = request.query;

            const filter = {};
            if (action) filter.action = action;
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { 'performedBy.studentId': searchRegex },
                    { 'performedBy.name': searchRegex },
                    { 'target.type': searchRegex },
                    { 'target.label': searchRegex }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [logs, total] = await Promise.all([
                ActivityLog.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                ActivityLog.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: logs,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
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
            const { search, page = 1, limit = 50 } = request.query;

            const filter = { round: roundId };
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { category: searchRegex }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [questions, total] = await Promise.all([
                Question.find(filter)
                    .sort({ order: 1, createdAt: 1 })
                    .skip(skip)
                    .limit(limitNum),
                Question.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: questions,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
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

            // If it's a bank question, we don't care about the round constraint.
            // But if it's not a bank question, it usually has a round. 
            // The frontend shouldn't pass `round` for a bank question anyway.
            if (updates.isManualEvaluation === false) {
                updates.assignedAdmin = null;
            }
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
     * QUESTION BANK ROUTES
     */

    // 1. GET /api/superadmin/question-bank
    fastify.get('/question-bank', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { search, page = 1, limit = 50 } = request.query;

            const filter = { isBank: true };
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { category: searchRegex }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [questions, total] = await Promise.all([
                Question.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Question.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: questions,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch question bank' });
        }
    });

    // 2. POST /api/superadmin/question-bank
    fastify.post('/question-bank', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const {
                title, description, inputFormat, outputFormat,
                sampleInput, sampleOutput, difficulty, points,
                type, category, options, correctAnswer,
                isManualEvaluation, assignedAdmin
            } = request.body;

            if (!title || !description) {
                return reply.code(400).send({ error: 'Title and description are required' });
            }
            if (isManualEvaluation && !assignedAdmin) {
                return reply.code(400).send({ error: 'A question marked for manual evaluation must be assigned to an admin' });
            }

            const question = new Question({
                isBank: true,
                title, description,
                inputFormat: inputFormat || '',
                outputFormat: outputFormat || '',
                sampleInput: sampleInput || '',
                sampleOutput: sampleOutput || '',
                difficulty: difficulty || 'MEDIUM',
                points: points || 10,
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
                target: { type: 'Question Bank', id: question._id.toString(), label: question.title },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: question });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create bank question' });
        }
    });

    // 3. POST /api/superadmin/rounds/:roundId/import-from-bank
    fastify.post('/rounds/:roundId/import-from-bank', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { questionIds } = request.body; // Array of Question Bank IDs

            if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
                return reply.code(400).send({ error: 'Valid array of questionIds is required' });
            }

            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            // Fetch the questions to clone
            const bankQuestions = await Question.find({ _id: { $in: questionIds }, isBank: true });

            if (bankQuestions.length === 0) {
                return reply.code(404).send({ error: 'No valid bank questions found for the provided IDs' });
            }

            // Figure out the current highest order in this round
            const count = await Question.countDocuments({ round: roundId });
            let startingOrder = count + 1;

            const clonedQuestions = bankQuestions.map((q) => {
                const cloned = new Question({
                    round: roundId,
                    isBank: false,
                    title: q.title,
                    description: q.description,
                    inputFormat: q.inputFormat,
                    outputFormat: q.outputFormat,
                    sampleInput: q.sampleInput,
                    sampleOutput: q.sampleOutput,
                    difficulty: q.difficulty,
                    points: q.points,
                    order: startingOrder++,
                    type: q.type,
                    category: q.category,
                    options: q.options,
                    correctAnswer: q.correctAnswer,
                    isManualEvaluation: q.isManualEvaluation,
                    assignedAdmin: q.assignedAdmin
                });
                return cloned.save();
            });

            const savedQuestions = await Promise.all(clonedQuestions);

            await logActivity({
                action: 'IMPORTED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `Imported ${savedQuestions.length} questions from Bank` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: `Successfully imported ${savedQuestions.length} questions.` });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to import questions from bank' });
        }
    });

    /**
     * GET /api/superadmin/manual-evaluations
     * Returns all submissions that have answers for questions assigned to this admin for manual evaluation.
     * Each entry contains: question info, student info, their answer, and existing manualScores.
     */
    fastify.get('/manual-evaluations', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const adminId = request.user.userId;
            const { page = 1, limit = 10 } = request.query;

            const filter = { isManualEvaluation: true, assignedAdmin: adminId };

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            // Find questions assigned to this admin with pagination
            const [questions, total] = await Promise.all([
                Question.find(filter)
                    .populate('round', 'name')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum)
                    .lean(),
                Question.countDocuments(filter)
            ]);

            if (questions.length === 0) {
                return reply.code(200).send({
                    success: true,
                    data: [],
                    pagination: {
                        totalRecords: total,
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum)
                    }
                });
            }

            // Collect unique round ObjectIds
            const roundObjectIds = [
                ...new Map(questions.map(q => [q.round._id.toString(), q.round._id])).values()
            ];

            // Find all submissions for those rounds
            const submissions = await Submission.find({ round: { $in: roundObjectIds } })
                .populate('student', 'studentId name')
                .lean();

            // Build result: for each question, list all students and their answer + score
            const result = questions.map(question => {
                const qRoundId = question.round._id.toString();

                const students = submissions
                    .filter(sub => sub.round.toString() === qRoundId)
                    .filter(sub => {
                        if (sub.assignedQuestions && sub.assignedQuestions.length > 0) {
                            return sub.assignedQuestions.some(id => id.toString() === question._id.toString());
                        }
                        try {
                            const parsed = JSON.parse(sub.codeContent || '{}');
                            return parsed[question._id.toString()] !== undefined;
                        } catch (_) {
                            return true;
                        }
                    })
                    .map(sub => {
                        let answer = null;
                        try {
                            const parsed = JSON.parse(sub.codeContent || '{}');
                            const rawAnswer = parsed[question._id.toString()];
                            answer = rawAnswer !== undefined ? rawAnswer : null;
                        } catch (_) {
                            answer = sub.codeContent || null;
                        }

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
                    question,
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

            // Recalculate total score as sum of all manual scores + autoScore
            const totalManualScore = submission.manualScores.reduce((sum, ms) => sum + (ms.score || 0), 0);
            submission.score = (submission.autoScore || 0) + totalManualScore;

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
            const { search, page = 1, limit = 20 } = request.query;

            // Fetch all submissions with a numeric score or manual scores
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

                // If search is provided, filter students here
                if (search) {
                    const searchRegex = new RegExp(search, 'i');
                    const matches = searchRegex.test(sub.student.studentId) || searchRegex.test(sub.student.name);
                    if (!matches) continue;
                }

                const sid = sub.student._id.toString();

                if (!studentMap[sid]) {
                    studentMap[sid] = {
                        student: sub.student,
                        totalScore: 0,
                        rounds: [],
                        dayWise: {}
                    };
                }

                const entry = studentMap[sid];
                const manualTotal = (sub.manualScores || []).reduce((s, ms) => s + (ms.score || 0), 0);
                // The total submission score is now autoScore + manualScores
                const submissionScore = (sub.autoScore || 0) + manualTotal;

                entry.totalScore += submissionScore;
                entry.rounds.push({
                    roundId: sub.round?._id,
                    roundName: sub.round?.name || 'Unknown Round',
                    score: submissionScore,
                    status: sub.status,
                    evaluatedAt: sub.updatedAt
                });

                const evalDates = (sub.manualScores || []).map(ms => ms.evaluatedAt).filter(Boolean);
                const dates = evalDates.length > 0 ? evalDates : [sub.updatedAt];

                for (const d of dates) {
                    if (!d) continue;
                    const dayKey = new Date(d).toISOString().slice(0, 10);
                    entry.dayWise[dayKey] = (entry.dayWise[dayKey] || 0) + submissionScore;
                }
            }

            // Convert to sorted array
            let result = Object.values(studentMap)
                .sort((a, b) => b.totalScore - a.totalScore)
                .map((entry, index) => ({
                    // We'll calculate rank AFTER pagination if we want global rank, 
                    // or keep it here for absolute across all matching students.
                    // Better to keep absolute rank.
                    absoluteRank: index + 1,
                    student: entry.student,
                    totalScore: entry.totalScore,
                    rounds: entry.rounds,
                    dayWise: Object.entries(entry.dayWise)
                        .map(([date, score]) => ({ date, score }))
                        .sort((a, b) => a.date.localeCompare(b.date))
                }));

            const total = result.length;
            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const totalPages = Math.ceil(total / limitNum);
            const skip = (pageNum - 1) * limitNum;

            const paginatedData = result.slice(skip, skip + limitNum);

            return reply.code(200).send({
                success: true,
                data: paginatedData,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
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
            const { search, page = 1, limit = 20 } = request.query;

            const filter = { role: 'ADMIN' };
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { studentId: searchRegex },
                    { name: searchRegex }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [admins, total] = await Promise.all([
                User.find(filter)
                    .select('studentId name isBanned tokenIssuedAfter createdAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                User.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: admins,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
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
            const { search, page = 1, limit = 20 } = request.query;

            const filter = { role: 'STUDENT' };
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                filter.$or = [
                    { studentId: searchRegex },
                    { name: searchRegex }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [students, total] = await Promise.all([
                User.find(filter)
                    .select('studentId name isBanned tokenIssuedAfter createdAt')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                User.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: students,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch students' });
        }
    });

    // POST /api/superadmin/students — create a new STUDENT
    fastify.post('/students', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
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
    // GET /api/superadmin/students/upload-template - DOWNLOAD SAMPLE EXCEL
    fastify.get('/students/upload-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = [
                { 'Roll No': '2024CS001' },
                { 'Roll No': '2024CS002' },
                { 'Roll No': '2024CS003' }
            ];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Students');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename=student_upload_template.xlsx');
            return reply.send(buffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate template' });
        }
    });

    // POST /api/superadmin/students/upload - BULK CREATE STUDENTS VIA EXCEL
    fastify.post('/students/upload', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No file uploaded' });

            const buffer = await data.toBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (json.length === 0) {
                return reply.code(400).send({ error: 'The uploaded file is empty' });
            }

            // Standardize keys (looking for "roll no" or "studentId")
            const studentIds = json.map(row => {
                const key = Object.keys(row).find(k =>
                    k.toLowerCase().replace(/[\s_]/g, '') === 'rollno' ||
                    k.toLowerCase() === 'studentid'
                );
                return key ? String(row[key]).trim() : null;
            }).filter(Boolean);

            if (studentIds.length === 0) {
                return reply.code(400).send({ error: 'No "Roll No" or "StudentId" column found in Excel' });
            }

            let createdCount = 0;
            let skippedCount = 0;
            const defaultPassword = '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            for (const sId of studentIds) {
                const exists = await User.findOne({ studentId: sId });
                if (exists) {
                    skippedCount++;
                    continue;
                }

                const student = new User({
                    studentId: sId,
                    name: `Student ${sId}`,
                    password: hashedPassword,
                    role: 'STUDENT',
                    isOnboarded: false
                });
                await student.save();
                createdCount++;
            }

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', label: `Bulk Upload: ${createdCount} created, ${skippedCount} skipped` },
                metadata: { createdCount, skippedCount },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: `Bulk creation complete. ${createdCount} students created, ${skippedCount} skipped.`,
                data: { createdCount, skippedCount }
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to process bulk upload' });
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

    /**
     * PATCH /api/superadmin/submissions/:submissionId/extra-time
     * Grants additional time (in minutes) to a specific student's active submission.
     */
    fastify.patch('/submissions/:submissionId/extra-time', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { submissionId } = request.params;
            const { addMinutes } = request.body;

            if (!addMinutes || isNaN(addMinutes) || addMinutes <= 0) {
                return reply.code(400).send({ error: 'Valid minutes to add are required' });
            }

            const submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            submission.extraTimeMinutes = (submission.extraTimeMinutes || 0) + Number(addMinutes);
            await submission.save();

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Submission', id: submissionId, label: `Granted +${addMinutes} mins extra time to ${submission.student?.name}` },
                metadata: { extraTimeMinutes: submission.extraTimeMinutes },
                ip: request.ip
            });

            return reply.send({ success: true, extraTimeMinutes: submission.extraTimeMinutes, message: `Added ${addMinutes} minutes successfully` });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to grant extra time' });
        }
    });

    /**
     * PATCH /api/superadmin/submissions/:submissionId/allow-reentry
     * Allows a student to re-enter a test they have already submitted or been disqualified from.
     */
    fastify.patch('/submissions/:submissionId/allow-reentry', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { submissionId } = request.params;
            const submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            if (submission.status !== 'SUBMITTED' && submission.status !== 'DISQUALIFIED') {
                return reply.code(400).send({ error: 'Re-entry can only be approved for submitted or disqualified tests' });
            }

            // Reset status so they can enter again
            submission.status = 'IN_PROGRESS';

            // Give them an extra 10 minutes by default so they can actually make changes before it auto-submits
            submission.extraTimeMinutes = (submission.extraTimeMinutes || 0) + 10;

            // Clear disqualification reason
            submission.disqualificationReason = null;

            await submission.save();

            // Log activity
            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Submission', id: submission._id, label: `Re-entry Approved for ${submission.student?.name}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Re-entry approved. Student granted 10 extra minutes.' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to approve re-entry' });
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
