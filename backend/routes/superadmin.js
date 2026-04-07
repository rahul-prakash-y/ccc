const mongoose = require('mongoose');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const PracticeSubmission = require('../models/PracticeSubmission');
const Round = require('../models/Round');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const AdminOTP = require('../models/AdminOTP');
const Team = require('../models/Team');
const { uploadImage } = require('../utils/cloudinary');
const fastifyMultipart = require('@fastify/multipart');
const { hydrateStaticData } = require('../services/cacheService');
const { checkRoundPermission } = require('../utils/permissions');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit-table');
const JSZip = require('jszip');
const fs = require('fs');
const path = require('path'); // Cache test


module.exports = async function (fastify, opts) {

    /**
     * POST /api/superadmin/rounds
     * Super Admin can create new Rounds/Tests dynamically
     */
    fastify.post('/rounds', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const {
                name, description, durationMinutes, type,
                questionCount, shuffleQuestions,
                testGroupId, testDurationMinutes, roundOrder,
                maxParticipants, startTime, endTime, authorizedAdmins
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
                roundOrder: roundOrder || 1,
                maxParticipants: maxParticipants || null,
                startTime: startTime || null,
                endTime: endTime || null,
                authorizedAdmins: authorizedAdmins || []
            });

            const savedRound = await round.save();
            const data = await Round.findById(savedRound._id).select('-startOtp -endOtp -otpIssuedAt -certificateTemplate.data');

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: data._id, label: data.name },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create round' });
        }
    });
 
    /**
     * PATCH /api/superadmin/rounds/:roundId/admins
     * Super Admin can assign/update authorized admins for a round
     */
    fastify.patch('/rounds/:roundId/admins', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { authorizedAdmins } = request.body; // Array of User IDs

            if (!Array.isArray(authorizedAdmins)) {
                return reply.code(400).send({ error: 'authorizedAdmins must be an array of User IDs' });
            }

            const round = await Round.findByIdAndUpdate(
                roundId,
                { $set: { authorizedAdmins } },
                { new: true }
            );

            if (!round) return reply.code(404).send({ error: 'Round not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `${round.name} admin assignment` },
                metadata: { authorizedAdmins },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: round });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update round admins' });
        }
    });

    /**
     * POST /api/superadmin/rounds/:roundId/certificate-template
     * Upload a PDF template for a specific round.
     */
    fastify.post('/rounds/:roundId/certificate-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No file uploaded' });

            const allowedMimeTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
            if (!allowedMimeTypes.includes(data.mimetype)) {
                return reply.code(400).send({ error: 'Only PDF and image files (PNG, JPEG) are allowed as certificate templates' });
            }

            const uploadsDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }

            // Save to DB
            const buffer = await data.toBuffer();
            const round = await Round.findByIdAndUpdate(roundId, { 
                certificateTemplate: {
                    data: buffer,
                    contentType: data.mimetype
                } 
            }, { new: true });

            if (!round) return reply.code(404).send({ error: 'Round not found' });

            await logActivity({
                action: 'UPLOADED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `Certificate template for ${round.name} (Stored in DB)` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Certificate template uploaded to DB successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to upload certificate template to DB' });
        }
    });

    /**
     * 1. GET /api/superadmin/audit-logs
     * Returns all submissions across all rounds, enriched with student + round info.
     */
    fastify.get('/audit-logs', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId, search, page = 1, limit = 20, type = 'GENERAL' } = request.query;

            const Model = type === 'PRACTICE' ? PracticeSubmission : Submission;

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
                Model.find(filter)
                    .populate('student', 'studentId name role isBanned')
                    .populate('round', 'name status type')
                    .populate('conductedBy', 'name')
                    .populate('manualScores.questionId', 'title points type')
                    .populate('manualScores.adminId', 'name')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Model.countDocuments(filter)
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
     * GET /api/superadmin/attendance
     * Returns student attendance based on successful OTP entry
     */
    fastify.get('/attendance', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { search, page = 1, limit = 20 } = request.query;

            let filter = { conductedBy: { $ne: null } };

            if (search) {
                const searchRegex = new RegExp(search, 'i');
                const [matchingStudents, matchingAdmins, matchingRounds] = await Promise.all([
                    User.find({
                        $or: [
                            { studentId: searchRegex },
                            { name: searchRegex }
                        ]
                    }).select('_id'),
                    User.find({ name: searchRegex, role: { $in: ['ADMIN', 'SUPER_ADMIN', 'SUPER_MASTER'] } }).select('_id'),
                    Round.find({ name: searchRegex }).select('_id')
                ]);

                const studentIds = matchingStudents.map(s => s._id);
                const adminIds = matchingAdmins.map(a => a._id);
                const roundIds = matchingRounds.map(r => r._id);

                filter.$or = [
                    { student: { $in: studentIds } },
                    { conductedBy: { $in: adminIds } },
                    { round: { $in: roundIds } }
                ];
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [attendance, total] = await Promise.all([
                Submission.find(filter)
                    .populate('student', 'studentId name')
                    .populate('conductedBy', 'name')
                    .populate('round', 'name')
                    .sort({ startTime: -1 })
                    .skip(skip)
                    .limit(limitNum),
                Submission.countDocuments(filter)
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.send({
                success: true,
                data: attendance,
                pagination: {
                    totalRecords: total,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum
                }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch attendance' });
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
            const { userId, role } = request.user;
            let filter = {};

            // If not superadmin, only show rounds where the admin is authorized OR practice rounds
            if (role !== 'SUPER_ADMIN' && role !== 'SUPER_MASTER') {
                filter = { 
                    $or: [
                        { authorizedAdmins: userId },
                        { type: 'PRACTICE' }
                    ]
                };
            }

            const rounds = await Round.find(filter).select('-startOtp -endOtp -otpIssuedAt -certificateTemplate.data').sort({ createdAt: 1 });
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
    fastify.patch('/rounds/:roundId/question-settings', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { questionCount, shuffleQuestions } = request.body;

            const updateFields = {};
            if (questionCount !== undefined) updateFields.questionCount = questionCount === '' ? null : Number(questionCount) || null;
            if (shuffleQuestions !== undefined) updateFields.shuffleQuestions = Boolean(shuffleQuestions);

            const round = await Round.findByIdAndUpdate(roundId, updateFields, { new: true }).select('-startOtp -endOtp -otpIssuedAt -certificateTemplate.data');
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

            // Check Permission
            const hasPermission = await checkRoundPermission(request.user, roundId);
            if (!hasPermission) return reply.code(403).send({ error: 'Forbidden: You do not have permission to access questions for this round' });

            const filter = {
                $or: [
                    { round: roundId },
                    { linkedRounds: roundId }
                ]
            };
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                const searchOr = [
                    { title: searchRegex },
                    { description: searchRegex },
                    { category: searchRegex }
                ];
                filter.$and = [
                    { $or: filter.$or },
                    { $or: searchOr }
                ];
                delete filter.$or;
            }

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const [questions, total] = await Promise.all([
                Question.find(filter)
                    .populate('assignedAdmin', 'name studentId')
                    .populate('createdBy', 'name email role')
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

            // Check Permission
            const hasPermission = await checkRoundPermission(request.user, roundId);
            if (!hasPermission) return reply.code(403).send({ error: 'Forbidden: You do not have permission to create questions for this round' });

            const {
                title, description, inputFormat, outputFormat,
                sampleInput, sampleOutput, difficulty, points,
                order, type, category, options, correctAnswer,
                isManualEvaluation, assignedAdmin, rubrics, rubricInstructions,
                problemImage
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
                isBank: true, // Always save to question bank as well
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
                assignedAdmin: isManualEvaluation ? assignedAdmin : null,
                createdBy: request.user?.userId || null,
                rubrics: rubrics || [],
                rubricInstructions: rubricInstructions || '',
                problemImage: problemImage || ''
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

            const existingQuestion = await Question.findById(questionId);
            if (!existingQuestion) return reply.code(404).send({ error: 'Question not found' });

            // Check Permission (if it's not a bank question, it has a round)
            if (existingQuestion.round) {
                const hasPermission = await checkRoundPermission(request.user, existingQuestion.round);
                if (!hasPermission) return reply.code(403).send({ error: 'Forbidden: You do not have permission to update questions for this round' });
            } else if (!existingQuestion.isBank && request.user.role !== 'SUPER_ADMIN' && request.user.role !== 'SUPER_MASTER') {
                // If it's a standalone question (not bank), only SuperAdmin for now or we need another check
                return reply.code(403).send({ error: 'Forbidden: Only Super Admins can update standalone questions' });
            }

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
            const { search, category, difficulty, assignedAdmin, page = 1, limit = 50 } = request.query;

            const filter = { isBank: true };
            if (category) filter.category = category;
            if (difficulty) filter.difficulty = difficulty;
            if (assignedAdmin) filter.assignedAdmin = assignedAdmin;

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
                    .populate('assignedAdmin', 'name studentId')
                    .populate('createdBy', 'name email role')
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
                isManualEvaluation, assignedAdmin, rubrics, rubricInstructions,
                problemImage
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
                assignedAdmin: isManualEvaluation ? assignedAdmin : null,
                createdBy: request.user?.userId || null,
                rubrics: rubrics || [],
                rubricInstructions: rubricInstructions || '',
                problemImage: problemImage || ''
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

    /**
     * GET /api/superadmin/questions/rubric-suggestions
     * returns unique rubrics found in the last 20 questions of a given category
     */
    fastify.get('/questions/rubric-suggestions', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { category } = request.query;
            if (!category) return reply.code(400).send({ error: 'Category is required' });

            const recentQuestions = await Question.find({ category: category.toUpperCase() })
                .sort({ createdAt: -1 })
                .limit(20)
                .select('rubrics');

            const rubricMap = new Map();
            recentQuestions.forEach(q => {
                if (q.rubrics && Array.isArray(q.rubrics)) {
                    q.rubrics.forEach(r => {
                        if (r && r.criterion) {
                            const key = `${r.criterion.trim().toLowerCase()}_${r.maxScore}`;
                            if (!rubricMap.has(key)) {
                                rubricMap.set(key, { criterion: r.criterion, maxScore: r.maxScore });
                            }
                        }
                    });
                }
            });

            return reply.code(200).send({ success: true, data: Array.from(rubricMap.values()) });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch rubric suggestions' });
        }
    });

    /**
     * POST /api/superadmin/bulk-upload-questions
     * Parses Excel, validates, and saves multiple questions to the library.
     */
    fastify.post('/bulk-upload-questions', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No spreadsheet file uploaded' });

            const roundId = request.query.roundId || data.fields?.roundId?.value;
            if (!roundId) return reply.code(400).send({ error: 'roundId is required for bulk upload' });

            // Check Permission
            const hasPermission = await checkRoundPermission(request.user, roundId);
            if (!hasPermission) return reply.code(403).send({ error: 'Forbidden: You do not have permission to upload questions for this round' });

            const buffer = await data.toBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) return reply.code(400).send({ error: 'Excel file is empty' });

            const validDifficulties = ['EASY', 'MEDIUM', 'HARD'];
            const validTypes = ['MCQ', 'CODE', 'DEBUG', 'FILL_BLANKS', 'EXPLAIN', 'UI_UX', 'MINI_HACKATHON'];
            const validCategories = ['SQL', 'HTML', 'CSS', 'UI_UX', 'GENERAL', 'MINI_HACKATHON'];

            const questionsToSave = [];
            let errorCount = 0;
            const errors = [];

            // Pre-fetch all admins to map studentId to _id for assignedAdmin
            const allAdmins = await User.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }).select('_id studentId name').lean();
            const adminMap = new Map(allAdmins.map(a => [String(a.studentId).trim(), a._id]));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const lineNum = i + 2; // Assuming header is line 1

                const title = row.title || row.Title;
                const description = row.description || row.Description || row.Problem_Statement;

                if (!title || !description) {
                    errorCount++;
                    errors.push(`Row ${lineNum}: Title and Description are required.`);
                    continue;
                }

                const difficulty = (row.difficulty || row.Difficulty || 'MEDIUM').toUpperCase();
                const type = (row.type || row.Type || 'CODE').toUpperCase();
                const category = (row.category || row.Category || 'GENERAL').toUpperCase();
                const points = Number(row.points || row.Points) || 10;
                const isManualEvaluation = String(row.isManualEvaluation || row.Manual_Evaluation).toLowerCase() === 'true';

                // Handle assignedAdmin (mapping Student ID from Excel to User ID)
                let assignedAdminId = null;
                const assignedAdminStudentId = String(row.assignedAdmin || row.Assigned_Admin || row.Manual_Evaluation_Assigned_To || '').trim();
                
                if (isManualEvaluation) {
                    if (assignedAdminStudentId) {
                        assignedAdminId = adminMap.get(assignedAdminStudentId);
                        if (!assignedAdminId) {
                            errorCount++;
                            errors.push(`Row ${lineNum}: Admin with Student ID "${assignedAdminStudentId}" not found.`);
                            continue;
                        }
                    } else {
                        errorCount++;
                        errors.push(`Row ${lineNum}: Manual evaluation requires an assigned Admin Student ID.`);
                        continue;
                    }
                }

                if (!validDifficulties.includes(difficulty)) {
                    errorCount++;
                    errors.push(`Row ${lineNum}: Invalid difficulty "${difficulty}".`);
                    continue;
                }
                if (!validTypes.includes(type)) {
                    errorCount++;
                    errors.push(`Row ${lineNum}: Invalid type "${type}".`);
                    continue;
                }
                if (!validCategories.includes(category)) {
                    errorCount++;
                    errors.push(`Row ${lineNum}: Invalid category "${category}".`);
                    continue;
                }

                // Handle Options for MCQ
                let options = [];
                if (type === 'MCQ') {
                    if (row.options || row.Options) {
                        options = String(row.options || row.Options).split(',').map(o => o.trim());
                    } else {
                        for (let j = 1; j <= 10; j++) {
                            const opt = row[`Option ${j}`] || row[`option ${j}`] || row[`Option${j}`];
                            if (opt) options.push(String(opt).trim());
                        }
                    }
                    if (options.length < 2) {
                        errorCount++;
                        errors.push(`Row ${lineNum}: MCQ requires at least 2 options.`);
                        continue;
                    }
                }

                questionsToSave.push({
                    round: roundId, // Bulk upload is now Round-specific
                    isBank: true, // Also keep in bank
                    title,
                    description,
                    inputFormat: row.inputFormat || row.Input_Format || '',
                    outputFormat: row.outputFormat || row.Output_Format || '',
                    sampleInput: row.sampleInput || row.Sample_Input || '',
                    sampleOutput: row.sampleOutput || row.Sample_Output || '',
                    difficulty,
                    points,
                    type,
                    category,
                    options,
                    correctAnswer: String(row.correctAnswer || row.Correct_Answer || ''),
                    isManualEvaluation,
                    assignedAdmin: assignedAdminId
                });
            }

            if (questionsToSave.length === 0) {
                return reply.code(400).send({ success: false, error: 'No valid questions found in file.', details: errors });
            }

            const savedQuestions = await Question.insertMany(questionsToSave);

            await logActivity({
                action: 'BULK_UPLOAD',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', label: `Bulk Upload: ${savedQuestions.length} items for Round ${roundId}` },
                metadata: { roundId, successCount: savedQuestions.length, errorCount },
                ip: request.ip
            });

            return reply.code(201).send({
                success: true,
                message: `Successfully imported ${savedQuestions.length} questions.`,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to process bulk upload', details: error.message });
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

            // Link them to the round (addToSet prevents duplicates)
            await Question.updateMany(
                { _id: { $in: bankQuestions.map(q => q._id) } },
                { $addToSet: { linkedRounds: roundId } }
            );

            await logActivity({
                action: 'IMPORTED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `Imported ${bankQuestions.length} questions from Bank` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: `Successfully imported ${bankQuestions.length} questions.` });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to import questions from bank' });
        }
    });

    // IMAGE UPLOAD TOOL
    fastify.post('/upload-image', { 
        preValidation: [fastify.requireAdmin],
        limits: { fileSize: 500 * 1024 } 
    }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No file uploaded' });

            const buffer = await data.toBuffer();
            const result = await uploadImage(buffer, 'ccc_ui_ux');

            return reply.send({ 
                success: true, 
                url: result.secure_url,
                public_id: result.public_id
            });
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            return reply.code(500).send({ error: 'Failed to upload image' });
        }
    });

    /**
     * @route   GET /api/superadmin/my-assignments
     * @desc    Get questions assigned to the current admin
     * @access  Private (Admin)
     */
    fastify.get('/my-assignments', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const questions = await Question.find({ assignedAdmin: request.user.userId })
                .populate('round', 'name type status')
                .sort({ createdAt: -1 });

            // Group by round for better UI organization
            const grouped = questions.reduce((acc, q) => {
                const roundId = q.round?._id?.toString() || 'LIBRARY';
                const roundName = q.round?.name || 'Global Library / Unlinked';
                const roundType = q.round?.type || 'N/A';
                
                if (!acc[roundId]) {
                    acc[roundId] = {
                        _id: roundId,
                        name: roundName,
                        type: roundType,
                        questions: []
                    };
                }
                acc[roundId].questions.push(q);
                return acc;
            }, {});

            reply.send({ 
                success: true, 
                data: Object.values(grouped),
                total: questions.length 
            });
        } catch (error) {
            console.error('Error fetching admin assignments:', error);
            reply.code(500).send({ error: 'Failed to fetch assignments' });
        }
    });

    /**
     * @route   GET /api/superadmin/manual-evaluations
     * Returns all submissions that have answers for questions assigned to this admin for manual evaluation.
     * Each entry contains: question info, student info, their answer, and existing manualScores.
     */
    fastify.get('/manual-evaluations', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const adminId = request.user.userId;
            const { page = 1, limit = 10, search = '', type = 'ALL' } = request.query;

            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            // 1. Get all questions assigned to this admin for manual evaluation
            // If type is PRACTICE, we also include all practice-round questions that need manual evaluation
            const questionFilter = { isManualEvaluation: true };
            if (type === 'PRACTICE') {
                const practiceRounds = await Round.find({ type: 'PRACTICE' }).select('_id');
                const practiceRoundIds = practiceRounds.map(r => r._id);
                questionFilter.$or = [
                    { assignedAdmin: adminId },
                    { round: { $in: practiceRoundIds } },
                    { linkedRounds: { $in: practiceRoundIds } }
                ];
            } else {
                questionFilter.assignedAdmin = adminId;
            }

            const adminQuestions = await Question.find(questionFilter).select('_id title description points type round category correctAnswer rubrics rubricInstructions').lean();

            if (adminQuestions.length === 0) {
                return reply.code(200).send({
                    success: true,
                    data: [],
                    pagination: { totalRecords: 0, totalPages: 0, page: pageNum, limit: limitNum }
                });
            }

            const adminQuestionIds = adminQuestions.map(q => q._id);

            // 2. Build filter for Submissions
            // Only include submissions that have at least one question assigned to this admin 
            // where no entry exists in manualScores for that admin/question pair yet.
            const submissionFilter = {
                status: 'SUBMITTED',
                $and: [
                    { assignedQuestions: { $in: adminQuestionIds } },
                    {
                        $expr: {
                            $gt: [
                                {
                                    $size: {
                                        $filter: {
                                            input: adminQuestions,
                                            as: "q",
                                            cond: {
                                                $and: [
                                                    { $in: ["$$q._id", "$assignedQuestions"] },
                                                    {
                                                        $not: {
                                                            $in: ["$$q._id", {
                                                                $map: {
                                                                    input: "$manualScores",
                                                                    as: "ms",
                                                                    in: "$$ms.questionId"
                                                                }
                                                            }]
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                },
                                0
                            ]
                        }
                    }
                ]
            };


            if (search.trim()) {
                const students = await User.find({
                    role: 'STUDENT',
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { studentId: { $regex: search, $options: 'i' } }
                    ]
                }).select('_id');
                submissionFilter.student = { $in: students.map(s => s._id) };
            }

            // 3. Find and Paginate from BOTH collections
            const queries = [];
            
            // Regular submissions
            if (type === 'ALL' || type === 'REGULAR' || type === 'GENERAL') {
                queries.push(Submission.find(submissionFilter).populate('student', 'name studentId').populate('round', 'name').sort({ updatedAt: -1 }).lean());
                queries.push(Submission.countDocuments(submissionFilter));
            } else {
                queries.push(Promise.resolve([]));
                queries.push(Promise.resolve(0));
            }

            // Practice submissions
            if (type === 'ALL' || type === 'PRACTICE') {
                queries.push(PracticeSubmission.find(submissionFilter).populate('student', 'name studentId').populate('round', 'name').sort({ updatedAt: -1 }).lean());
                queries.push(PracticeSubmission.countDocuments(submissionFilter));
            } else {
                queries.push(Promise.resolve([]));
                queries.push(Promise.resolve(0));
            }

            const [regularSubs, regularCount, practiceSubs, practiceCount] = await Promise.all(queries);

            const allCombinedResults = [
                ...regularSubs.map(s => ({ ...s, isPractice: false })),
                ...practiceSubs.map(s => ({ ...s, isPractice: true }))
            ].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            const total = regularCount + practiceCount;
            const submissions = allCombinedResults.slice(skip, skip + limitNum);
            // 4. Transform results to show Student -> [Questions]
            const result = submissions.map(sub => {
                let answers = {};
                try {
                    answers = JSON.parse(sub.codeContent || '{}');
                } catch (e) {
                    answers = {};
                }

                const relevantQuestions = adminQuestions.filter(q =>
                    sub.assignedQuestions.some(aqId => aqId.toString() === q._id.toString())
                ).filter(q => {
                    // Only include questions that have NOT been graded yet
                    return !sub.manualScores?.some(ms => ms.questionId?.toString() === q._id.toString());
                }).map(q => {
                    return {
                        question: q,
                        answer: answers[q._id.toString()],
                        existingScore: null,
                        isPractice: sub.isPractice
                    };
                });

                return {
                    submissionId: sub._id,
                    student: sub.student,
                    round: sub.round,
                    pdfUrl: sub.pdfUrl,
                    status: sub.status,
                    isPractice: sub.isPractice,
                    assignedQuestionsCount: sub.assignedQuestions.length,
                    questions: relevantQuestions
                };
            }).filter(item => item.questions.length > 0);

            return reply.code(200).send({
                success: true,
                data: result,
                pagination: {
                    totalRecords: total,
                    total: total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
                }
            });
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
            const { questionId, score, feedback, rubricScores } = request.body;
            const adminId = request.user.userId;

            if (!questionId) {
                return reply.code(400).send({ error: 'questionId is required' });
            }

            // Verify the question is actually assigned to this admin
            const question = await Question.findOne({ _id: questionId, isManualEvaluation: true, assignedAdmin: adminId });
            if (!question) {
                return reply.code(403).send({ error: 'You are not authorized to evaluate this question' });
            }

            let submission = await Submission.findById(submissionId) || await PracticeSubmission.findById(submissionId);
            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            let finalQuestionScore = score;
            let validatedRubricScores = [];

            // If rubricScores are provided, calculate total score from them
            if (rubricScores && Array.isArray(rubricScores) && rubricScores.length > 0) {
                let totalFromRubrics = 0;
                for (const rs of rubricScores) {
                    const rubricDef = (question.rubrics || []).find(r => r.criterion === rs.criterion);
                    const maxScore = rubricDef ? rubricDef.maxScore : Infinity;
                    
                    if (rs.score > maxScore) {
                        return reply.code(400).send({ error: `Score for "${rs.criterion}" exceeds maximum allowed (${maxScore})` });
                    }
                    totalFromRubrics += Number(rs.score) || 0;
                    validatedRubricScores.push({ criterion: rs.criterion, score: Number(rs.score) || 0 });
                }
                finalQuestionScore = totalFromRubrics;
            }

            if (finalQuestionScore === undefined) {
                return reply.code(400).send({ error: 'score or rubricScores are required' });
            }

            // Upsert the manual score entry for this question
            const existingIndex = submission.manualScores.findIndex(
                ms => ms.questionId && ms.questionId.toString() === questionId.toString()
            );

            const scoreEntry = {
                questionId,
                adminId,
                score: finalQuestionScore,
                rubricScores: validatedRubricScores,
                feedback: feedback || '',
                evaluatedAt: new Date()
            };

            if (existingIndex >= 0) {
                submission.manualScores[existingIndex] = scoreEntry;
            } else {
                submission.manualScores.push(scoreEntry);
            }

            // Recalculate total score as sum of all manual scores + autoScore
            const totalManualScore = submission.manualScores.reduce((sum, ms) => sum + (ms.score || 0), 0);
            
            // Recalculate solved count (MCQ + Manual scores > 0)
            const manualSolvedCount = submission.manualScores.filter(ms => ms.score > 0).length;
            submission.solvedCount = (submission.mcqSolvedCount || 0) + manualSolvedCount;

            // Fetch round to check if it's a team test
            const round = await Round.findById(submission.round);
            let finalScore = (submission.autoScore || 0) + totalManualScore;
            if (round && round.isTeamTest) {
                finalScore = finalScore / 2;
            }
            submission.score = finalScore;

            // NEW: Check if all manual questions for this round have been graded
            const manualQuestions = await Question.find({ round: submission.round, isManualEvaluation: true });
            const gradedQuestionIds = submission.manualScores.map(ms => ms.questionId?.toString());
            const allGraded = manualQuestions.every(q => gradedQuestionIds.includes(q._id.toString()));

            if (allGraded && submission.status === 'SUBMITTED') {
                submission.status = 'COMPLETED';
            }

            await submission.save();

            // RECALCULATE WINNERS for this round if certificates are released
            if (round && round.certificatesReleased) {
                // Clear existing winners first
                await Submission.updateMany({ round: submission.round }, { hasCertificate: false });

                // Find new top N
                // Include BOTH SUBMITTED and COMPLETED statuses
                const winners = await Submission.find({
                    round: submission.round,
                    status: { $in: ['SUBMITTED', 'COMPLETED'] }
                })
                    .sort({ score: -1 })
                    .limit(round.winnerLimit || 10)
                    .select('_id');

                const winnerIds = winners.map(w => w._id);
                if (winnerIds.length > 0) {
                    await Submission.updateMany(
                        { _id: { $in: winnerIds } },
                        { hasCertificate: true }
                    );
                }
            }

            // Invalidate ranking cache since scores have changed
            const { invalidateRankingCache } = require('../utils/eligibility');
            invalidateRankingCache();

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
            const { search, page = 1, limit = 20, type = 'ALL' } = request.query;
            const pageNum = Math.max(1, Number(page));
            const limitNum = Math.max(1, Number(limit));
            const skip = (pageNum - 1) * limitNum;

            const ActiveSubmissionModel = (type === 'PRACTICE') ? PracticeSubmission : Submission;

            // 1. Build Match Stage
            const matchStage = {
                $or: [
                    { 'manualScores.0': { $exists: true } },
                    { score: { $ne: null } },
                    { autoScore: { $gt: 0 } }
                ]
            };

            // 2. Fetch Aggregated Data
            const pipeline = [
                { $match: matchStage },
                // Calculate score per submission
                {
                    $project: {
                        student: 1,
                        round: 1,
                        updatedAt: 1,
                        status: 1,
                        submissionScore: {
                            $add: [
                                { $ifNull: ["$autoScore", 0] },
                                {
                                    $reduce: {
                                        input: { $ifNull: ["$manualScores", []] },
                                        initialValue: 0,
                                        in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] }
                                    }
                                }
                            ]
                        },
                        submissionSolved: { $ifNull: ["$solvedCount", 0] }
                    }
                },
                // Join Round name
                {
                    $lookup: {
                        from: 'rounds',
                        localField: 'round',
                        foreignField: '_id',
                        as: 'roundDetails'
                    }
                },
                { $unwind: { path: '$roundDetails', preserveNullAndEmptyArrays: true } },
                // Group by Student
                {
                    $group: {
                        _id: "$student",
                        totalScore: { $sum: "$submissionScore" },
                        totalSolved: { $sum: "$submissionSolved" },
                        rounds: {
                            $push: {
                                roundId: "$round",
                                roundName: { $ifNull: ["$roundDetails.name", "Unknown Round"] },
                                score: "$submissionScore",
                                solved: "$submissionSolved",
                                status: "$status",
                                evaluatedAt: "$updatedAt"
                            }
                        }
                    }
                },
                // Join Student details
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'studentDetails'
                    }
                },
                { $unwind: '$studentDetails' },
                // Apply Search
                ...(search ? [{
                    $match: {
                        $or: [
                            { 'studentDetails.studentId': { $regex: search, $options: 'i' } },
                            { 'studentDetails.name': { $regex: search, $options: 'i' } }
                        ]
                    }
                }] : []),
                // Sort by total score
                { $sort: { totalScore: -1 } }
            ];

            // Get total count (for pagination)
            const countPipeline = [...pipeline, { $count: "total" }];
            const countResult = await ActiveSubmissionModel.aggregate(countPipeline);
            const total = countResult[0]?.total || 0;

            // Get paginated results
            const results = await ActiveSubmissionModel.aggregate([
                ...pipeline,
                { $skip: skip },
                { $limit: limitNum }
            ]);

            const paginatedData = results.map((r, index) => ({
                absoluteRank: skip + index + 1,
                student: {
                    _id: r._id,
                    studentId: r.studentDetails.studentId,
                    name: r.studentDetails.name
                },
                totalScore: r.totalScore,
                totalSolved: r.totalSolved,
                rounds: r.rounds,
                // Optional: add dummy dayWise if still needed by frontend (or refactor frontend)
                dayWise: []
            }));

            return reply.code(200).send({
                success: true,
                data: paginatedData,
                pagination: {
                    totalRecords: total,
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(total / limitNum)
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
            const { roundId } = request.query;

            const question = await Question.findById(questionId);
            if (!question) return reply.code(404).send({ error: 'Question not found' });

            if (roundId && question.isBank) {
                // Just unlink from the round
                let modified = false;
                if (question.round?.toString() === roundId) {
                    question.round = null;
                    modified = true;
                }
                if (question.linkedRounds?.some(rid => rid.toString() === roundId)) {
                    question.linkedRounds = question.linkedRounds.filter(rid => rid.toString() !== roundId);
                    modified = true;
                }

                if (modified) {
                    await question.save();

                    await logActivity({
                        action: 'UNLINKED',
                        performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                        target: { type: 'Question', id: questionId, label: `Unlinked from round ${roundId}` },
                        ip: request.ip
                    });

                    // Refresh RAM Cache
                    await hydrateStaticData();
                }

                return reply.code(200).send({ success: true, message: 'Question unlinked successfully' });
            }

            await Question.findByIdAndDelete(questionId);

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', id: questionId, label: question.title },
                ip: request.ip
            });

            // Refresh RAM Cache
            await hydrateStaticData();

            return reply.code(200).send({ success: true, message: 'Question deleted successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete question' });
        }
    });

    /**
     * POST /api/superadmin/questions/bulk-delete
     * Deletes or unlinks multiple questions based on mode.
     * Modes: 'delete' (default, deletes non-bank, unlinks bank), 'unlink' (only unlinks bank, skips others)
     */
    fastify.post('/questions/bulk-delete', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { questionIds, roundId, mode = 'delete' } = request.body;

            if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
                return reply.code(400).send({ error: 'Valid array of questionIds is required' });
            }

            let unlinkedCount = 0;
            let deletedCount = 0;
            let skippedCount = 0;

            for (const qId of questionIds) {
                const question = await Question.findById(qId);
                if (!question) continue;

                const belongsToRound = question.round?.toString() === roundId;
                const isLinkedToRound = question.linkedRounds?.some(rid => rid.toString() === roundId);

                if (!belongsToRound && !isLinkedToRound) {
                    skippedCount++;
                    continue;
                }

                if (question.isBank) {
                    // Check if we are in a round context for unlinking
                    if (roundId) {
                        let modified = false;
                        if (belongsToRound) {
                            question.round = null; 
                            modified = true;
                        }
                        if (isLinkedToRound) {
                            question.linkedRounds = question.linkedRounds.filter(rid => rid.toString() !== roundId);
                            modified = true;
                        }
                        if (modified) {
                            await question.save();
                            unlinkedCount++;
                        }
                    } else if (mode === 'delete') {
                        // Permanent delete of the BANK record itself (no roundId provided)
                        await Question.findByIdAndDelete(qId);
                        deletedCount++;
                    } else {
                        skippedCount++;
                    }
                } else {
                    // It's a standard round-specific question record
                    if (mode === 'delete') {
                        await Question.findByIdAndDelete(qId);
                        deletedCount++;
                    } else {
                        // For non-bank questions, 'unlink' effectively means nulling the round
                        // but usually these should just be deleted. If mode is unlink, we'll
                        // just null it out so it hides from the round.
                        question.round = null;
                        await question.save();
                        unlinkedCount++;
                    }
                }
            }

            await logActivity({
                action: 'BULK_QUESTION_OP',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', label: `Bulk ${mode.toUpperCase()}: ${deletedCount} deleted, ${unlinkedCount} unlinked, ${skippedCount} skipped` },
                metadata: { questionIds, deletedCount, unlinkedCount, skippedCount, roundId, mode },
                ip: request.ip
            });

            // Update RAM Cache for student test view
            await hydrateStaticData();

            return reply.code(200).send({
                success: true,
                message: `Bulk operation complete. ${deletedCount} deleted, ${unlinkedCount} unlinked, ${skippedCount} skipped.`,
                data: { deletedCount, unlinkedCount, skippedCount }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to bulk process questions' });
        }
    });

    /**
     * POST /api/superadmin/rounds/:roundId/unlink-all
     * Remove or delete ALL questions associated with a round.
     */
    fastify.post('/rounds/:roundId/unlink-all', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;

            // Check Permission
            const hasPermission = await checkRoundPermission(request.user, roundId);
            if (!hasPermission) return reply.code(403).send({ error: 'Forbidden' });

            const questions = await Question.find({
                $or: [{ round: roundId }, { linkedRounds: roundId }]
            });

            if (questions.length === 0) {
                return reply.code(200).send({ success: true, message: 'No questions to remove.' });
            }

            let unlinkedCount = 0;
            let deletedCount = 0;

            for (const q of questions) {
                if (q.isBank) {
                    let modified = false;
                    if (q.round?.toString() === roundId) {
                        q.round = null; 
                        modified = true;
                    }
                    if (q.linkedRounds?.some(rid => rid.toString() === roundId)) {
                        q.linkedRounds = q.linkedRounds.filter(rid => rid.toString() !== roundId);
                        modified = true;
                    }
                    if (modified) {
                        await q.save();
                        unlinkedCount++;
                    }
                } else {
                    // Standard question record
                    await Question.findByIdAndDelete(q._id);
                    deletedCount++;
                }
            }

            await logActivity({
                action: 'UNLINK_ALL_QUESTIONS',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `Unlinked all questions from round ${roundId}` },
                metadata: { deletedCount, unlinkedCount },
                ip: request.ip
            });

            // Update RAM Cache for student test view
            await hydrateStaticData();

            return reply.code(200).send({
                success: true,
                message: `Successfully removed all ${questions.length} questions. ${unlinkedCount} unlinked, ${deletedCount} deleted.`,
                data: { unlinkedCount, deletedCount }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to unlink all questions' });
        }
    });

    /**
     * ADMIN MANAGEMENT — all routes below are SUPER_ADMIN only
     */

    // GET /api/superadmin/admins — list all ADMIN users
    fastify.get('/admins', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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
                    .sort({ createdAt: -1 }),
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
    fastify.post('/admins', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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
    fastify.delete('/admins/:adminId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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
    fastify.patch('/admins/:adminId/block', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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
    fastify.patch('/admins/:adminId/force-logout', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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
    fastify.patch('/admins/:adminId/reset-password', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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

    // GET /api/superadmin/rounds/:roundId/upload-template - DOWNLOAD SAMPLE EXCEL FOR QUESTIONS
    fastify.get('/rounds/:roundId/upload-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { type: queryType } = request.query;
            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            // Check Permission
            const hasPermission = await checkRoundPermission(request.user, roundId);
            if (!hasPermission) return reply.code(403).send({ error: 'Forbidden: You do not have permission to access templates for this round' });

            const activeType = queryType || round.type;

            // Base columns for all templates
            const data = [{
                Title: 'Sample Question Title',
                Description: 'Detailed problem statement here...',
                Difficulty: 'MEDIUM', // EASY, MEDIUM, HARD
                Points: 10,
                isManualEvaluation: (activeType === 'UI_UX_CHALLENGE' || activeType === 'MINI_HACKATHON') ? 'TRUE' : 'FALSE', // TRUE or FALSE
                Assigned_Admin: 'AdminStudentId', // Student ID of the admin for manual evaluation
                Category: activeType || 'GENERAL',
            }];

            // Type-specific columns
            if (activeType === 'HTML_CSS_QUIZ' || activeType === 'GENERAL') {
                data[0].Type = 'MCQ';
                data[0].Option1 = 'Option A';
                data[0].Option2 = 'Option B';
                data[0].Option3 = 'Option C';
                data[0].Option4 = 'Option D';
                data[0].Correct_Answer = 'Option A';
            } else if (activeType === 'SQL_CONTEST' || activeType === 'HTML_CSS_DEBUG' || activeType === 'MINI_HACKATHON') {
                data[0].Type = 'CODE';
                data[0].Input_Format = 'Standard input description';
                data[0].Output_Format = 'Expected output description';
                data[0].Sample_Input = '1 2';
                data[0].Sample_Output = '3';
            } else if (activeType === 'UI_UX_CHALLENGE') {
                data[0].Type = 'UI_UX';
                data[0].Problem_Statement = 'Design a glassmorphic dashboard for...';
                data[0].isManualEvaluation = 'TRUE';
            } else if (activeType === 'PRACTICE') {
                data[0].Type = 'CODE';
                data[0].Input_Format = 'Practice test input';
                data[0].Output_Format = 'Practice test output';
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Questions');

            // Set column widths for better readability
            ws['!cols'] = [
                { wch: 30 }, // Title
                { wch: 50 }, // Description
                { wch: 10 }, // Difficulty
                { wch: 10 }, // Points
                { wch: 15 }, // isManualEvaluation
                { wch: 20 }, // Assigned_Admin
                { wch: 15 }, // Category
                { wch: 10 }, // Type
            ];

            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', `attachment; filename=bulk_upload_template_${round.name.replace(/\s+/g, '_')}.xlsx`);
            return reply.send(buffer);

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate template' });
        }
    });

    // GET /api/superadmin/admins/upload-template - DOWNLOAD SAMPLE EXCEL FOR ADMINS
    fastify.get('/admins/upload-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = [
                { 'AdminId': 'admin_01', 'Name': 'John Doe', 'Password': 'secretpassword' },
            ];
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Admins');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename=admin_upload_template.xlsx');
            return reply.send(buffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate template' });
        }
    });

    // POST /api/superadmin/admins/upload - BULK CREATE ADMINS VIA EXCEL
    fastify.post('/admins/upload', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
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

            const bulkData = json.map(row => {
                const idKey = Object.keys(row).find(k =>
                    ['adminid', 'studentid', 'admin_id', 'username'].includes(k.toLowerCase().replace(/[\s_]/g, ''))
                );
                const nameKey = Object.keys(row).find(k => k.toLowerCase() === 'name');
                const passwordKey = Object.keys(row).find(k => k.toLowerCase() === 'password' || k.toLowerCase() === 'secret');

                if (!idKey) return null;

                return {
                    studentId: String(row[idKey]).trim(),
                    name: row[nameKey] ? String(row[nameKey]).trim() : null,
                    password: row[passwordKey] ? String(row[passwordKey]).trim() : '123456',
                    role: 'ADMIN'
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                return reply.code(400).send({ error: 'No valid admin records found in Excel' });
            }

            let createdCount = 0;
            let skippedCount = 0;

            for (const item of bulkData) {
                const existing = await User.findOne({ studentId: item.studentId });
                if (existing) {
                    skippedCount++;
                } else {
                    const hashedPassword = await bcrypt.hash(item.password, 10);
                    await User.create({
                        ...item,
                        password: hashedPassword
                    });
                    createdCount++;
                }
            }

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Admin', label: `Bulk Upload: ${createdCount} created, ${skippedCount} skipped` },
                metadata: { createdCount, skippedCount },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: `Bulk creation complete. ${createdCount} admins created, ${skippedCount} skipped.`,
                data: { createdCount, skippedCount }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to process bulk upload' });
        }
    });

    /**
     * STUDENT MANAGEMENT — all routes below are SUPER_ADMIN only
     */

    // GET /api/superadmin/students — list all STUDENT users
    fastify.get('/students', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { search, page = 1, limit = 20, onboardingStatus } = request.query;

            const filter = { role: 'STUDENT' };
            
            if (onboardingStatus === 'ONBOARDED') filter.isOnboarded = true;
            else if (onboardingStatus === 'PENDING') filter.isOnboarded = false;

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

            const [students, total, onboardedCount, pendingCount] = await Promise.all([
                User.find(filter)
                    .select('studentId name email isBanned tokenIssuedAfter createdAt team linkedinProfile githubProfile phone bio isOnboarded dob department allocatedServer')
                    .populate('team', 'name')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limitNum),
                User.countDocuments(filter),
                User.countDocuments({ role: 'STUDENT', isOnboarded: true }),
                User.countDocuments({ role: 'STUDENT', isOnboarded: false })
            ]);

            const totalPages = Math.ceil(total / limitNum);

            return reply.code(200).send({
                success: true,
                data: students,
                onboardingStats: {
                    onboarded: onboardedCount,
                    pending: pendingCount
                },
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
            const { studentId, email } = request.body;
            if (!studentId) {
                return reply.code(400).send({ error: 'studentId is required' });
            }
            const exists = await User.findOne({ studentId });
            if (exists) return reply.code(409).send({ error: 'User with this ID already exists' });

            const defaultPassword = '123456';
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            const studentData = {
                ...request.body,
                password: hashedPassword,
                role: 'STUDENT',
                isOnboarded: false
            };

            // Ensure name is set if not provided
            if (!studentData.name) {
                studentData.name = `Student ${studentId}`;
            }

            const student = new User(studentData);
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

            // Cascading delete: Remove all submissions for this student to maintain integrity
            await Submission.deleteMany({ student: studentId });

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
     * PATCH /api/superadmin/students/:id
     * Super Admin can update student details (name, email, department, team, bio, linkedin/github, etc.)
     */
    fastify.patch('/students/:id', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const updates = request.body;
 
            // Prevent changing studentId via this route for now (or handle with care)
            delete updates.studentId;
 
            const student = await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
            if (!student) return reply.code(404).send({ error: 'Student not found' });
 
            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id, label: `Updated details for ${student.studentId}` },
                metadata: { updates },
                ip: request.ip
            });
 
            return reply.code(200).send({ success: true, data: student });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update student details' });
        }
    });

    /**
     * PATCH /api/superadmin/students/:id/publish-report
     * Toggle the report publication status for a student.
     */
    fastify.patch('/students/:id/publish-report', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { isReportPublished } = request.body;
            
            const student = await User.findByIdAndUpdate(id, { isReportPublished }, { new: true });
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id, label: `${student.studentId} — Report ${isReportPublished ? 'PUBLISHED' : 'UNPUBLISHED'}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, isReportPublished: student.isReportPublished });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to toggle publication status' });
        }
    });

    // 1b. GET /api/superadmin/student-scores/export — export leaderboard as XLSX
    fastify.get('/student-scores/export', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { search, type = 'ALL' } = request.query;
            const ActiveSubmissionModel = type === 'PRACTICE' ? PracticeSubmission : Submission;

            // Reuse aggregation pipeline (no pagination)
            const pipeline = [
                {
                    $match: {
                        $or: [
                            { 'manualScores.0': { $exists: true } },
                            { score: { $ne: null } },
                            { autoScore: { $gt: 0 } }
                        ]
                    }
                },
                {
                    $project: {
                        student: 1,
                        round: 1,
                        status: 1,
                        submissionScore: {
                            $add: [
                                { $ifNull: ["$autoScore", 0] },
                                {
                                    $reduce: {
                                        input: { $ifNull: ["$manualScores", []] },
                                        initialValue: 0,
                                        in: { $add: ["$$value", { $ifNull: ["$$this.score", 0] }] }
                                    }
                                }
                            ]
                        },
                        submissionSolved: { $ifNull: ["$solvedCount", 0] }
                    }
                },
                {
                    $lookup: {
                        from: 'rounds',
                        localField: 'round',
                        foreignField: '_id',
                        as: 'roundDetails'
                    }
                },
                { $unwind: { path: '$roundDetails', preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: "$student",
                        totalScore: { $sum: "$submissionScore" },
                        totalSolved: { $sum: "$submissionSolved" },
                        rounds: {
                            $push: {
                                name: { $ifNull: ["$roundDetails.name", "Unknown"] },
                                score: "$submissionScore"
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'studentDetails'
                    }
                },
                { $unwind: '$studentDetails' },
                ...(search ? [{
                    $match: {
                        $or: [
                            { 'studentDetails.studentId': { $regex: search, $options: 'i' } },
                            { 'studentDetails.name': { $regex: search, $options: 'i' } }
                        ]
                    }
                }] : []),
                { $sort: { totalScore: -1 } }
            ];

            const results = await ActiveSubmissionModel.aggregate(pipeline);

            // Format for Excel
            const excelRows = results.map((r, i) => ({
                'Rank': i + 1,
                'Roll No': r.studentDetails.studentId,
                'Full Name': r.studentDetails.name,
                'Total Score': r.totalScore,
                'Questions Solved': r.totalSolved,
                'Rounds Info': r.rounds.map(round => `${round.name}: ${round.score}`).join(' | ')
            }));

            const ws = XLSX.utils.json_to_sheet(excelRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Scores');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            return reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename=Leaderboard_${type}_${new Date().toISOString().split('T')[0]}.xlsx`)
                .send(buffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Exporter encountered a failure' });
        }
    });

    // GET /api/superadmin/students/:id/report — export student performance as PDF
    fastify.get('/students/:id/report', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const student = await User.findById(id).populate('team').lean();
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            const [contestSubmissions, practiceSubmissions] = await Promise.all([
                Submission.find({ student: id }).populate('round').lean(),
                PracticeSubmission.find({ student: id }).populate('round').lean()
            ]);

            const pdfBuffer = await new Promise(async (resolve, reject) => {
                try {
                    const doc = new PDFDocument({ margin: 40, size: 'A4' });
                    let buffers = [];
                    doc.on('data', buffers.push.bind(buffers));
                    doc.on('end', () => resolve(Buffer.concat(buffers)));
                    doc.on('error', reject);

                    const NAVY = '#1e293b';
                    const PURPLE = '#581c87';
                    const AMBER = '#f59e0b';
                    const LIGHT_BLUE = '#eff6ff';

                    doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF', { align: 'center' });
                    doc.text('TECHNOLOGY', { align: 'center' });
                    doc.moveDown(0.2);
                    doc.fontSize(16).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
                    doc.moveDown(0.5);

                    const pageWidth = doc.page.width;
                    const barWidth = 100;
                    doc.rect((pageWidth - barWidth) / 2, doc.y, barWidth, 3).fill(AMBER);
                    doc.moveDown(0.8);

                    const pillWidth = 180;
                    const pillHeight = 24;
                    const pillX = (pageWidth - pillWidth) / 2;
                    doc.roundedRect(pillX, doc.y, pillWidth, pillHeight, 12).fill(NAVY);
                    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('PERFORMANCE ANALYTICS REPORT', pillX, doc.y + 7, { width: pillWidth, align: 'center' });
                    doc.moveDown(1.5);

                    doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
                    doc.moveDown(1.5);

                    // --- 1. STUDENT PROFILE ---
                    doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
                    doc.fillColor(NAVY).fontSize(14).text('1. STUDENT PROFILE', 50, doc.y);
                    doc.moveDown(0.8);

                    const profileY = doc.y;
                    const col1X = 60;
                    const col2X = pageWidth / 2 + 50;

                    const drawField = (label, value, x, y, width) => {
                        doc.fillColor('#64748b').fontSize(10).text(label.toUpperCase(), x, y);
                        doc.fillColor(NAVY).fontSize(11).font('Helvetica-Bold').text(value || 'N/A', x + 90, y, { align: 'right', width: width || ((pageWidth / 3) - 100) });
                        doc.moveTo(x, y + 14).lineTo(x + (pageWidth / 2) - 30, y + 14).strokeColor('#f1f5f9').dash(2, { space: 2 }).stroke().undash();
                    };

                    const attendedCount = contestSubmissions.filter(s => s.status !== 'NOT_STARTED').length;

                    drawField('Full Name', student.name, col1X, profileY);
                    drawField('Roll Number', student.studentId, col2X, profileY);
                    drawField('Department', student.department, col1X, profileY + 35);
                    drawField('Round Stats', `${attendedCount} Contests Attempted`, col2X, profileY + 35);

                    doc.moveDown(4.5);

                    // --- 2. ASSESSMENT SUMMARY (CONTESTS) ---
                    doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
                    doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text('2. CONTEST PERFORMANCE', 50, doc.y);
                    doc.moveDown(1);

                    if (contestSubmissions.length > 0) {
                        const assessmentRows = [];
                        for (const s of contestSubmissions) {
                            const questions = await Question.find({
                                $or: [{ round: s.round?._id }, { linkedRounds: s.round?._id }]
                            });
                            const totalPoints = questions.reduce((acc, q) => acc + (q.points || 0), 0);
                            const qualified = s.score >= totalPoints * 0.5;
                            const resultText = qualified ? 'PASS' : 'FAIL';

                            assessmentRows.push([
                                new Date(s.createdAt).toLocaleDateString(),
                                s.round?.name || 'Untitled Round',
                                String(s.score ?? 0),
                                resultText
                            ]);
                        }

                        const assessmentTable = {
                            headers: [
                                { label: "Date", property: 'date', width: 100 },
                                { label: "Assessment Title", property: 'level', width: 220 },
                                { label: "Score", property: 'score', width: 80 },
                                { label: "Status", property: 'result', width: 100 }
                            ],
                            rows: assessmentRows
                        };

                        await doc.table(assessmentTable, {
                            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                            prepareRow: (row, indexColumn) => {
                                doc.font("Helvetica").fontSize(10);
                                if (indexColumn === 3) {
                                    doc.fillColor(row[3] === 'PASS' ? '#16a34a' : '#dc2626');
                                } else {
                                    doc.fillColor(NAVY);
                                }
                            }
                        });
                    } else {
                        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#94a3b8').text('No contest attempts recorded.');
                    }
                    doc.moveDown(2);

                    // --- 3. PRACTICE PERFORMANCE ---
                    doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
                    doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text('3. PRACTICE SESSIONS', 50, doc.y);
                    doc.moveDown(1);

                    if (practiceSubmissions.length > 0) {
                        const practiceRows = practiceSubmissions.map(s => ([
                            new Date(s.createdAt).toLocaleDateString(),
                            s.round?.name || 'Practice Test',
                            String(s.score ?? 0),
                            'COMPLETED'
                        ]));

                        const practiceTable = {
                            headers: [
                                { label: "Date", property: 'date', width: 100 },
                                { label: "Practice Environment", property: 'level', width: 220 },
                                { label: "Score", property: 'score', width: 80 },
                                { label: "Activity", property: 'result', width: 100 }
                            ],
                            rows: practiceRows
                        };

                        await doc.table(practiceTable, {
                            prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                            prepareRow: () => doc.font("Helvetica").fontSize(10).fillColor(NAVY)
                        });
                    } else {
                        doc.font('Helvetica-Oblique').fontSize(10).fillColor('#94a3b8').text('No practice records found.');
                    }

                    // --- Footer ---
                    const footerY = doc.page.height - 40;
                    doc.moveTo(40, footerY).lineTo(doc.page.width - 40, footerY).strokeColor(AMBER).lineWidth(2).stroke();
                    doc.fillColor('#94a3b8').fontSize(8).text('Generated by CCC Internal Portal · Verification Code: ' + student._id.toString().slice(-8).toUpperCase(), 40, footerY + 8, { align: 'center' });

                    doc.end();
                } catch (err) {
                    reject(err);
                }
            });

            return reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename=Report_${student.studentId}.pdf`)
                .send(pdfBuffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate report' });
        }
    });

    // GET /api/superadmin/students/upload-template - DOWNLOAD SAMPLE EXCEL
    fastify.get('/students/upload-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = [
                {
                    'Students Name': 'John Doe',
                    'Roll No': '2024CS001',
                    'Mail Id': 'john@example.com',
                    'Phone Number': '9876543210',
                    'Dept': 'CSE',
                    'Accommodation': 'Hostel',
                    'Team': 'Team Alpha',
                    'LinkedIn': 'https://linkedin.com/in/johndoe',
                    'GitHub': 'https://github.com/johndoe',
                    'DOB': '2005-01-01',
                    'Gender': 'Male'
                },
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

            const bulkData = json.map(row => {
                const idKey = Object.keys(row).find(k =>
                    ['rollno', 'studentid', 'roll_no', 'roll number'].includes(k.toLowerCase().replace(/[\s_]/g, ''))
                );
                const nameKey = Object.keys(row).find(k => ['name', 'studentsname', 'students name'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const emailKey = Object.keys(row).find(k => ['email', 'mailid', 'mail id'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const phoneKey = Object.keys(row).find(k => ['phone', 'phonenumber', 'phone number'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const dobKey = Object.keys(row).find(k => ['dob', 'dateofbirth', 'date of birth'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const linkedinKey = Object.keys(row).find(k => ['linkedin', 'linkedin profile', 'linkedinprofile'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const githubKey = Object.keys(row).find(k => ['github', 'github profile', 'githubprofile'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const deptKey = Object.keys(row).find(k => ['dept', 'department'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const accommodationKey = Object.keys(row).find(k => ['accommodation', 'accomodation'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const teamKey = Object.keys(row).find(k => k.toLowerCase() === 'team');
                const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender');

                if (!idKey) return null;

                const dobVal = row[dobKey] ? new Date(row[dobKey]) : null;

                // Basic enum mapping for Accommodation
                let accommodation = null;
                if (row[accommodationKey]) {
                    const accValue = String(row[accommodationKey]).trim().toLowerCase();
                    if (accValue.includes('hostel')) accommodation = 'Hostel';
                    else if (accValue.includes('day') || accValue.includes('scholar')) accommodation = 'Day Scholar';
                }

                // Basic enum mapping for Gender
                let gender = null;
                if (row[genderKey]) {
                    const genValue = String(row[genderKey]).trim().toLowerCase();
                    if (genValue === 'male') gender = 'Male';
                    else if (genValue === 'female') gender = 'Female';
                    else if (genValue === 'other') gender = 'Other';
                    else if (genValue.includes('prefer')) gender = 'Prefer not to say';
                }

                return {
                    studentId: String(row[idKey]).trim(),
                    name: row[nameKey] ? String(row[nameKey]).trim() : null,
                    email: row[emailKey] ? String(row[emailKey]).trim() : null,
                    phone: row[phoneKey] ? String(row[phoneKey]).trim() : null,
                    dob: isNaN(dobVal) ? null : dobVal,
                    linkedinProfile: row[linkedinKey] ? String(row[linkedinKey]).trim() : null,
                    githubProfile: row[githubKey] ? String(row[githubKey]).trim() : null,
                    department: row[deptKey] ? String(row[deptKey]).trim() : null,
                    accommodation,
                    gender,
                    teamName: row[teamKey] ? String(row[teamKey]).trim() : null, // Store team name for lookup
                    role: 'STUDENT'
                };
            }).filter(Boolean);

            if (bulkData.length === 0) {
                return reply.code(400).send({ error: 'No valid student records found in Excel' });
            }

            let createdCount = 0;
            let skippedCount = 0;

            const Team = require('../models/Team');

            for (const item of bulkData) {
                const existing = await User.findOne({ studentId: item.studentId });
                if (existing) {
                    skippedCount++;
                } else {
                    // Try to find team if teamName is provided
                    let teamId = null;
                    if (item.teamName) {
                        const team = await Team.findOne({ name: new RegExp('^' + item.teamName + '$', 'i') });
                        if (team) {
                            teamId = team._id;
                        } else {
                            // Optionally create team if it doesn't exist? (Not requested, but good trait)
                            // For now, let's just skip team assignment if not found
                        }
                    }
                    // Default password "123456"
                    const defaultPassword = '123456';
                    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

                    const studentObj = {
                        ...item,
                        password: hashedPassword, // Students set during onboarding
                        isOnboarded: false,
                        team: teamId
                    };
                    delete studentObj.teamName; // Remove helper key

                    const student = await User.create(studentObj);

                    // Update Team if assigned
                    if (teamId) {
                        await Team.findByIdAndUpdate(teamId, { $addToSet: { members: student._id } });
                    }

                    createdCount++;
                }
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

    // GET /api/superadmin/admins/list - MINIMAL LIST FOR TRANSFERS
    fastify.get('/admins/list', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const admins = await User.find({ role: 'ADMIN', isBanned: false }).select('_id name studentId');
            return reply.code(200).send({ success: true, data: admins });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch admins list' });
        }
    });

    // PATCH /api/superadmin/manual-evaluations/transfer/:questionId - TRANSFER EVALUATION
    fastify.patch('/manual-evaluations/transfer/:questionId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { questionId } = request.params;
            const { newAdminId } = request.body;
            const currentAdminId = request.user.userId;

            if (!newAdminId) return reply.code(400).send({ error: 'newAdminId is required' });

            const question = await Question.findOne({ _id: questionId, isManualEvaluation: true, assignedAdmin: currentAdminId });
            if (!question) return reply.code(403).send({ error: 'You are not authorized to transfer this evaluation' });

            const newAdmin = await User.findOne({ _id: newAdminId, role: 'ADMIN', isBanned: false });
            if (!newAdmin) return reply.code(404).send({ error: 'Target admin not found or inactive' });

            question.assignedAdmin = newAdminId;
            await question.save();

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Question', id: questionId, label: `Transferred evaluation of "${question.title}" to ${newAdmin.name}` },
                metadata: { fromAdmin: currentAdminId, toAdmin: newAdminId },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Evaluation assignment transferred successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to transfer evaluation' });
        }
    });

    /**
     * DELETE /api/superadmin/submissions/:submissionId
     * Permanently deletes a student's submission record.
     */
    fastify.delete('/submissions/:submissionId', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { submissionId } = request.params;
            let submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            let Model = Submission;
            
            if (!submission) {
                submission = await PracticeSubmission.findById(submissionId).populate('student', 'name studentId');
                Model = PracticeSubmission;
            }

            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            await Model.findByIdAndDelete(submissionId);

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
     * DELETE /api/superadmin/students/bulk-delete
     * Deletes students in bulk based on year prefix (from studentId).
     */
    fastify.delete('/students/bulk-delete', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { yearPrefix, confirmCode } = request.body;

            if (!yearPrefix || yearPrefix.length < 2) {
                return reply.code(400).send({ error: 'A valid year prefix (at least 2 characters) is required' });
            }

            if (confirmCode !== 'DELETE-' + yearPrefix) {
                return reply.code(400).send({ error: `Confirmation failed. Please type "DELETE-${yearPrefix}" to confirm.` });
            }

            // Find students to be deleted
            const studentsToDelete = await User.find({
                role: 'STUDENT',
                studentId: { $regex: `^${yearPrefix}`, $options: 'i' }
            }).select('_id name studentId');

            if (studentsToDelete.length === 0) {
                return reply.code(404).send({ error: `No students found matching prefix "${yearPrefix}"` });
            }

            const studentIds = studentsToDelete.map(s => s._id);

            // 1. Delete associated Submissions
            const submissionResult = await Submission.deleteMany({ student: { $in: studentIds } });

            // 2. Delete the Students
            const userResult = await User.deleteMany({ _id: { $in: studentIds } });

            // 3. Clear team memberships if needed (optional as users are deleted, but good practice)
            const Team = require('../models/Team');
            await Team.updateMany(
                { members: { $in: studentIds } },
                { $pull: { members: { $in: studentIds } } }
            );

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', label: `Bulk Delete Year ${yearPrefix}: ${userResult.deletedCount} students and ${submissionResult.deletedCount} submissions removed.` },
                metadata: { yearPrefix, studentCount: userResult.deletedCount, submissionCount: submissionResult.deletedCount },
                ip: request.ip
            });

            return reply.send({
                success: true,
                message: `Bulk deletion complete. Removed ${userResult.deletedCount} students and ${submissionResult.deletedCount} submissions.`,
                data: { deletedCount: userResult.deletedCount, submissionCount: submissionResult.deletedCount }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to execute bulk deletion' });
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

            if (addMinutes === undefined || isNaN(addMinutes) || Number(addMinutes) === 0) {
                return reply.code(400).send({ error: 'Valid minutes adjustment is required' });
            }

            let submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            if (!submission) {
                submission = await PracticeSubmission.findById(submissionId).populate('student', 'name studentId');
            }

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
            const { addMinutes = 10 } = request.body || {}; // Default to 10 mins if not provided

            let submission = await Submission.findById(submissionId).populate('student', 'name studentId');
            if (!submission) {
                submission = await PracticeSubmission.findById(submissionId).populate('student', 'name studentId');
            }

            if (!submission) return reply.code(404).send({ error: 'Submission not found' });

            if (submission.status !== 'SUBMITTED' && submission.status !== 'DISQUALIFIED') {
                return reply.code(400).send({ error: 'Re-entry can only be approved for submitted or disqualified tests' });
            }

            // Reset status so they can enter again
            submission.status = 'IN_PROGRESS';

            // Give them extra time so they can actually make changes
            submission.extraTimeMinutes = (submission.extraTimeMinutes || 0) + Number(addMinutes);

            // Clear disqualification reason
            submission.disqualificationReason = null;

            // CRITICAL: Also un-ban the student and restore session validity
            const student = await User.findById(submission.student);
            if (student) {
                student.isBanned = false;
                student.banReason = null;
                student.tokenIssuedAfter = null;
                await student.save();
            }

            await submission.save();

            // Log activity
            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Submission', id: submission._id, label: `Re-entry Approved for ${submission.student?.name}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: `Re-entry approved. Student granted ${addMinutes} extra minutes.` });
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

    // PATCH /api/superadmin/students/:userId/team — assign a student to a team
    fastify.patch('/students/:userId/team', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { teamId } = request.body; // Can be null to unassign

            const student = await User.findById(userId);
            if (!student) return reply.code(404).send({ error: 'Student not found' });

            const oldTeamId = student.team;

            // 1. Update the Student
            student.team = teamId || null;
            await student.save();

            // 2. Update Team Memberships
            // Remove from old team
            if (oldTeamId) {
                const Team = require('../models/Team');
                await Team.findByIdAndUpdate(oldTeamId, { $pull: { members: userId } });
            }
            // Add to new team
            if (teamId) {
                const Team = require('../models/Team');
                await Team.findByIdAndUpdate(teamId, { $addToSet: { members: userId } });
            }

            const populatedStudent = await User.findById(userId).populate('team', 'name');

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: userId, label: `${student.studentId} — Team Update` },
                metadata: { oldTeamId, newTeamId: teamId },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: populatedStudent });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update student team' });
        }
    });

    /**
     * POST /api/superadmin/rounds/:roundId/generate-otp
     * Allows SuperAdmin to generate Start/End OTPs and unlock a round.
     */
    fastify.post('/rounds/:roundId/generate-otp', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const adminId = request.user.userId;
            const crypto = require('crypto');

            const startOtp = crypto.randomInt(100000, 999999).toString();
            const endOtp = crypto.randomInt(100000, 999999).toString();

            // Store in AdminOTP model (per admin)
            await AdminOTP.findOneAndUpdate(
                { adminId, roundId },
                { startOtp, endOtp, otpIssuedAt: new Date() },
                { upsert: true, new: true }
            );

            // Also update the round status to waiting if it's currently locked
            const round = await Round.findById(roundId);
            if (round && round.status === 'LOCKED') {
                round.status = 'WAITING_FOR_OTP';
                round.isOtpActive = true;
                await round.save();
            }

            await logActivity({
                action: 'OTP_GENERATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: round?.name || 'Round' },
                metadata: { adminId },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, startOtp, endOtp });
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
        const { status, isOtpActive, durationMinutes, testDurationMinutes, maxParticipants, startTime, endTime, name, isTeamTest } = request.body;

        try {
            const updates = {};
            if (status) updates.status = status;
            if (isOtpActive !== undefined) updates.isOtpActive = isOtpActive;
            if (durationMinutes !== undefined) updates.durationMinutes = Number(durationMinutes) || 60;
            if (testDurationMinutes !== undefined) updates.testDurationMinutes = testDurationMinutes === null ? null : (Number(testDurationMinutes) || null);
            if (maxParticipants !== undefined) updates.maxParticipants = maxParticipants;
            if (startTime !== undefined) updates.startTime = startTime;
            if (endTime !== undefined) updates.endTime = endTime;
            if (name !== undefined && name.trim()) updates.name = name.trim();
            if (isTeamTest !== undefined) updates.isTeamTest = Boolean(isTeamTest);

            const round = await Round.findByIdAndUpdate(roundId, updates, { new: true }).select('-startOtp -endOtp -otpIssuedAt -certificateTemplate.data');
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
     * POST /api/superadmin/rounds/:roundId/allow-student
     * Add student to round whitelist
     */
    fastify.post('/rounds/:roundId/allow-student', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;
        const { studentId } = request.body; // Internal ObjectId

        try {
            const round = await Round.findByIdAndUpdate(
                roundId,
                { $addToSet: { allowedStudentIds: studentId } },
                { new: true }
            );
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            return reply.send({ success: true, data: round.allowedStudentIds });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to allow student' });
        }
    });

    /**
     * POST /api/superadmin/rounds/:roundId/disallow-student
     * Remove student from round whitelist
     */
    fastify.post('/rounds/:roundId/disallow-student', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { roundId } = request.params;
        const { studentId } = request.body;

        try {
            const round = await Round.findByIdAndUpdate(
                roundId,
                { $pull: { allowedStudentIds: studentId } },
                { new: true }
            );
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            return reply.send({ success: true, data: round.allowedStudentIds });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to disallow student' });
        }
    });
    /**
     * DELETE /api/superadmin/rounds/:roundId
     * Deletes a round and its associated questions/submissions.
     */
    fastify.delete('/rounds/:roundId', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
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

    /**
     * TEAM MANAGEMENT ROUTES
     */

    // 1. GET /api/superadmin/teams
    fastify.get('/teams', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const teams = await Team.find({}).populate('members', 'studentId name').sort({ name: 1 });
            return reply.code(200).send({ success: true, data: teams });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch teams' });
        }
    });

    // 2. POST /api/superadmin/teams
    fastify.post('/teams', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { name, members } = request.body;
        if (!name) return reply.code(400).send({ error: 'Team name is required' });

        try {
            const team = new Team({ name, members: members || [] });
            await team.save();

            if (members && members.length > 0) {
                await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
            }

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', id: team._id, label: team.name },
                ip: request.ip
            });

            return reply.code(201).send({ success: true, data: team });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to create team' });
        }
    });

    // 3. PUT /api/superadmin/teams/:teamId
    fastify.put('/teams/:teamId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { teamId } = request.params;
        const { name, members } = request.body;

        try {
            const oldTeam = await Team.findById(teamId);
            if (!oldTeam) return reply.code(404).send({ error: 'Team not found' });

            // Remove team ref from old members not in the new list
            const oldMembers = (oldTeam.members || []).map(m => m.toString());
            const newMembers = (members || []).map(m => m.toString());
            const removedMembers = oldMembers.filter(m => !newMembers.includes(m));

            if (removedMembers.length > 0) {
                await User.updateMany({ _id: { $in: removedMembers } }, { $set: { team: null } });
            }

            const team = await Team.findByIdAndUpdate(teamId, { name, members }, { new: true });

            if (members && members.length > 0) {
                await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
            }

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', id: teamId, label: team.name },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, data: team });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update team' });
        }
    });

    // 4. DELETE /api/superadmin/teams/:teamId
    fastify.delete('/teams/:teamId', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { teamId } = request.params;

        try {
            const team = await Team.findByIdAndDelete(teamId);
            if (!team) return reply.code(404).send({ error: 'Team not found' });

            // Clear team ref for all members
            await User.updateMany({ team: teamId }, { $set: { team: null } });

            await logActivity({
                action: 'DELETED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', id: teamId, label: team.name },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Team deleted' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to delete team' });
        }
    });

    /**
     * POST /api/superadmin/teams/bulk-delete
     * Deletes multiple teams and clears their references in the User collection.
     */
    fastify.post('/teams/bulk-delete', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { teamIds } = request.body;

            if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
                return reply.code(400).send({ error: 'Valid array of teamIds is required' });
            }

            // Find teams to be deleted for logging purposes
            const teamsToDelete = await Team.find({ _id: { $in: teamIds } });
            const teamNames = teamsToDelete.map(t => t.name).join(', ');

            // Delete teams
            const deleteResult = await Team.deleteMany({ _id: { $in: teamIds } });

            // Clear team ref for all members of these teams
            await User.updateMany({ team: { $in: teamIds } }, { $set: { team: null } });

            await logActivity({
                action: 'BULK_DELETED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', label: `Bulk Deleted ${deleteResult.deletedCount} teams: ${teamNames}` },
                metadata: { teamIds, count: deleteResult.deletedCount },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: `Successfully deleted ${deleteResult.deletedCount} teams`,
                count: deleteResult.deletedCount
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to bulk delete teams' });
        }
    });

    /**
     * PATCH /api/superadmin/teams/:id/publish-report
     * Toggle the report publication status for a team.
     */
    fastify.patch('/teams/:id/publish-report', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { isReportPublished } = request.body;
            
            const team = await Team.findByIdAndUpdate(id, { isReportPublished }, { new: true });
            if (!team) return reply.code(404).send({ error: 'Team not found' });

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', id, label: `${team.name} — Report ${isReportPublished ? 'PUBLISHED' : 'UNPUBLISHED'}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, isReportPublished: team.isReportPublished });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to toggle team publication status' });
        }
    });

    // 5. POST /api/superadmin/teams/bulk-upload
    fastify.post('/teams/bulk-upload', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No spreadsheet file uploaded' });

            const buffer = await data.toBuffer();
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) return reply.code(400).send({ error: 'Excel file is empty' });

            let errorCount = 0;
            const errors = [];
            let successCount = 0;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const lineNum = i + 2;

                const teamName = row['Team Name'] || row.teamName || row.name || row.Name;
                const membersStr = row['Members'] || row.members || row.Members || '';

                if (!teamName) {
                    errorCount++;
                    errors.push(`Row ${lineNum}: Team Name is required.`);
                    continue;
                }

                const memberStudentIds = String(membersStr).split(',').map(id => id.trim()).filter(id => id);

                // Find users by studentId
                const users = await User.find({ studentId: { $in: memberStudentIds } });
                const foundStudentIds = users.map(u => u.studentId);
                const missingIds = memberStudentIds.filter(id => !foundStudentIds.includes(id));

                if (missingIds.length > 0) {
                    errors.push(`Row ${lineNum} (${teamName}): Students not found: ${missingIds.join(', ')}`);
                }

                const userIds = users.map(u => u._id);

                // Upsert team
                let team = await Team.findOne({ name: teamName });
                if (team) {
                    // Update existing team
                    // Convert ObjectIds to strings for Set deduplication, then back
                    const currentMemberIds = (team.members || []).map(id => id.toString());
                    const newUserIds = userIds.map(id => id.toString());
                    const combinedIds = [...new Set([...currentMemberIds, ...newUserIds])];

                    team.members = combinedIds;
                    await team.save();
                } else {
                    // Create new
                    team = new Team({ name: teamName, members: userIds });
                    await team.save();
                }

                // Update users to refer to this team
                if (userIds.length > 0) {
                    await User.updateMany({ _id: { $in: userIds } }, { $set: { team: team._id } });
                }

                successCount++;
            }

            await logActivity({
                action: 'BULK_UPLOAD',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Team', label: `Bulk Upload: ${successCount} Teams` },
                metadata: { successCount, errorCount },
                ip: request.ip
            });

            return reply.code(201).send({
                success: true,
                message: `Successfully processed ${successCount} teams.`,
                errorCount,
                errors: errors.length > 0 ? errors : undefined
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to process bulk upload', details: error.message });
        }
    });

    // 6. GET /api/superadmin/team-scores
    fastify.get('/team-scores', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const teams = await Team.find({}).populate('members', '_id name studentId');
            const submissions = await Submission.find({ score: { $ne: null } }).lean();

            const teamScores = teams.map(team => {
                const memberIds = team.members.map(m => m._id.toString());
                const totalScore = submissions
                    .filter(sub => memberIds.includes(sub.student.toString()))
                    .reduce((sum, sub) => sum + (sub.score || 0), 0);

                return {
                    _id: team._id,
                    name: team.name,
                    members: team.members,
                    totalScore
                };
            }).sort((a, b) => b.totalScore - a.totalScore);

            return reply.code(200).send({ success: true, data: teamScores });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch team scores' });
        }

    });
    // 6. GET /api/superadmin/teams/:teamId/report
    fastify.get('/teams/:teamId/report', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        const { teamId } = request.params;

        try {
            const team = await Team.findById(teamId).populate('members', 'name studentId phone email department');
            if (!team) return reply.code(404).send({ error: 'Team not found' });

            // Fetch all teams to calculate rank
            const allTeams = await Team.find({}).lean();
            const allSubmissions = await Submission.find({ score: { $ne: null } }).lean();

            const scores = allTeams.map(t => {
                const teamSubmissions = allSubmissions.filter(s =>
                    t.members.some(mId => mId.toString() === s.student.toString())
                );
                return {
                    id: t._id.toString(),
                    totalScore: teamSubmissions.reduce((sum, s) => sum + (s.score || 0), 0)
                };
            }).sort((a, b) => b.totalScore - a.totalScore);

            const rank = scores.findIndex(s => s.id === teamId) + 1;
            const teamTotalScore = scores.find(s => s.id === teamId)?.totalScore || 0;

            // Fetch individual scores for team members
            const memberStats = await Promise.all(team.members.map(async (m) => {
                const memberSubmissions = allSubmissions.filter(s => s.student.toString() === m._id.toString());
                const totalScore = memberSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
                const attended = memberSubmissions.filter(s => s.status !== 'NOT_STARTED').length;
                return {
                    name: m.name,
                    studentId: m.studentId,
                    attended,
                    score: totalScore
                };
            })); // Target test area

            const pdfBuffer = await new Promise(async (resolve, reject) => {
                try {
                    const doc = new PDFDocument({ margin: 40, size: 'A4' });
                    let buffers = [];
                    doc.on('data', buffers.push.bind(buffers));
                    doc.on('end', () => resolve(Buffer.concat(buffers)));
                    doc.on('error', reject);

                    // Styles
                    const NAVY = '#1e293b';
                    const PURPLE = '#581c87';
                    const ACCENT = '#f59e0b';
                    const LIGHT_BLUE = '#eff6ff';

                    // Header
                    doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF', { align: 'center' });
                    doc.text('TECHNOLOGY', { align: 'center' });
                    doc.moveDown(0.2);
                    doc.fontSize(16).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
                    doc.moveDown(0.5);
                    const pageWidth = doc.page.width;
                    doc.rect((pageWidth - 100) / 2, doc.y, 100, 3).fill(ACCENT);
                    doc.moveDown(0.8);
                    const chipWidth = 180; // Increased from 160 for padding
                    const chipHeight = 24;
                    const chipX = (pageWidth - chipWidth) / 2;
                    doc.roundedRect(chipX, doc.y, chipWidth, chipHeight, 12).fill(NAVY);
                    doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('TEAM PERFORMANCE REPORT', chipX, doc.y + 7, { width: chipWidth, align: 'center' });
                    doc.moveDown(2);

                    // Team Info Box
                    const infoY = doc.y;
                    doc.roundedRect(40, infoY, pageWidth - 80, 70, 10).fill(LIGHT_BLUE).strokeColor('#e2e8f0').stroke();

                    doc.fillColor(NAVY).fontSize(18).font('Helvetica-Bold').text(team.name.toUpperCase(), 60, infoY + 15);
                    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`RANK #${rank} OVERALL`, 60, infoY + 38);

                    doc.fillColor(PURPLE).fontSize(24).font('Helvetica-Bold').text(String(teamTotalScore), pageWidth - 200, infoY + 15, { width: 140, align: 'right' });
                    doc.fontSize(10).font('Helvetica-Bold').fillColor(PURPLE).text('AGGREGATE POINTS', pageWidth - 200, infoY + 42, { width: 140, align: 'right' });

                    doc.moveDown(4);

                    // 1. SQUAD OVERVIEW
                    doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
                    doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text('1. SQUAD OVERVIEW', 50, doc.y);
                    doc.moveDown(1);

                    const table = {
                        headers: [
                            { label: "Roll Number", property: 'studentId', width: 100 },
                            { label: "Member Name", property: 'name', width: 200 },
                            { label: "Attended", property: 'attended', width: 80 },
                            { label: "Contribution", property: 'score', width: 100 }
                        ],
                        rows: memberStats.map(m => [
                            m.studentId,
                            m.name,
                            String(m.attended),
                            String(m.score)
                        ])
                    };

                    await doc.table(table, {
                        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                            doc.font("Helvetica").fontSize(10).fillColor(NAVY);
                            if (indexRow % 2 === 0) doc.addBackground(rectRow, LIGHT_BLUE, 0.4);
                        }
                    });

                    // Footer
                    const footerY = doc.page.height - 60;
                    doc.rect(40, footerY, doc.page.width - 80, 6).fill(NAVY);

                    doc.end();
                } catch (err) {
                    reject(err);
                }
            });

            reply.type('application/pdf').header('Content-Disposition', `attachment; filename=Team_Report_${team.name}.pdf`).send(pdfBuffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate team report' });
        }
    });

    /**
     * GET /api/superadmin/admin-contributions
     * Returns statistics for admin contributions: uploaded, assigned, and evaluated questions.
     */
    fastify.get('/admin-contributions', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            // Fetch all admins
            const admins = await User.find({ role: { $in: ['ADMIN', 'SUPER_ADMIN'] } }).select('_id name email role studentId');

            const stats = await Promise.all(admins.map(async (admin) => {
                const adminId = admin._id;

                // 1. Uploaded Questions
                const uploadedCount = await Question.countDocuments({ createdBy: adminId });

                // 2. Assigned Questions (for manual evaluation)
                const assignedCount = await Question.countDocuments({ isManualEvaluation: true, assignedAdmin: adminId });

                // 3. Evaluated Questions (from Submissions where manualScores contains adminId)
                const evaluatedResult = await Submission.aggregate([
                    { $unwind: "$manualScores" },
                    { $match: { "manualScores.adminId": adminId } },
                    { $count: "evaluatedCount" }
                ]);
                const evaluatedCount = evaluatedResult.length > 0 ? evaluatedResult[0].evaluatedCount : 0;

                return {
                    _id: adminId,
                    name: admin.name,
                    studentId: admin.studentId,
                    role: admin.role,
                    uploadedQuestions: uploadedCount,
                    assignedEvaluations: assignedCount,
                    evaluatedQuestions: evaluatedCount
                };
            }));

            // Sort by evaluations, then uploaded
            stats.sort((a, b) => b.evaluatedQuestions - a.evaluatedQuestions || b.uploadedQuestions - a.uploadedQuestions);

            return reply.code(200).send({ success: true, data: stats });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch admin contributions' });
        }
    });

    /**
     * POST /api/superadmin/allocate-server
     * Bulk assigns a routing server to a list of students.
     */
    fastify.post('/allocate-server', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const { serverUrl, studentIds } = request.body;

            if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
                return reply.code(400).send({ error: 'A valid array of student IDs is required' });
            }

            // If serverUrl is empty, it clears their allocation (null).
            const targetUrl = serverUrl ? serverUrl.trim() : null;

            const result = await User.updateMany(
                { studentId: { $in: studentIds }, role: 'STUDENT' },
                { $set: { allocatedServer: targetUrl } }
            );

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'User', id: 'BULK', label: `Allocated server ${targetUrl || 'NONE'} to ${result.modifiedCount} students` },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: `Successfully allocated server to ${result.modifiedCount} students.`,
                matchedCount: result.matchedCount,
                modifiedCount: result.modifiedCount
            });

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to allocate server' });
        }
    });

    /**
     * CERTIFICATE MANAGEMENT
     */

    // 1. POST /api/superadmin/certificates/template - UPLOAD TEMPLATE
    fastify.post('/certificates/template', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) return reply.code(400).send({ error: 'No file uploaded' });

            const uploadsDir = path.join(__dirname, '../uploads');
            if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

            const filePath = path.join(uploadsDir, 'certificate_template' + path.extname(data.filename));

            // Remove existing templates to avoid confusion
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file.startsWith('certificate_template')) {
                    fs.unlinkSync(path.join(uploadsDir, file));
                }
            }

            const buffer = await data.toBuffer();
            fs.writeFileSync(filePath, buffer);

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Certificate', label: 'Updated Background Template' },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Template uploaded successfully' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to upload template' });
        }
    });

    // 2. GET /api/superadmin/rounds/:roundId/certificate-template - GET ROUND TEMPLATE PREVIEW FROM DB
    fastify.get('/rounds/:roundId/certificate-template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const round = await Round.findById(roundId);
            if (!round || !round.certificateTemplate || !round.certificateTemplate.data) {
                return reply.code(404).send({ error: 'No template found in DB for this round' });
            }

            reply.type(round.certificateTemplate.contentType || 'application/pdf');
            return reply.send(round.certificateTemplate.data);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch template from DB' });
        }
    });

    // Legacy Global Preview (Optional, can keep for backward compatibility or remove)
    fastify.get('/certificates/template', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            const files = fs.readdirSync(uploadsDir);
            const templateFile = files.find(f => f.startsWith('certificate_template'));
            if (!templateFile) return reply.code(404).send({ error: 'No template found' });
            const buffer = fs.readFileSync(path.join(uploadsDir, templateFile));
            reply.type('application/pdf');
            return reply.send(buffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch template' });
        }
    });

    // 3. GET /api/superadmin/certificates/generate - GENERATE BULK PDF ZIP
    fastify.get('/certificates/generate', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId, limit = 10 } = request.query;
            if (!roundId) return reply.code(400).send({ error: 'roundId is required' });

            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            const templateFile = round.certificateTemplate;

            if (!templateFile || !templateFile.data) return reply.code(400).send({ error: 'Please upload a certificate template to DB for this round first' });
            const templateBuffer = templateFile.data;

            // Fetch top winners
            const submissions = await Submission.find({ round: roundId, status: 'SUBMITTED' })
                .sort({ score: -1 })
                .limit(Number(limit))
                .populate('student', 'name studentId');

            if (submissions.length === 0) return reply.code(404).send({ error: 'No submissions found for this round' });

            const zip = new JSZip();

            for (const sub of submissions) {
                const studentName = sub.student?.name || 'Student';

                // Create PDF using PDFKit
                const doc = new PDFDocument({
                    layout: 'landscape',
                    size: 'A4',
                    margin: 0
                });

                // Buffer to collect PDF data
                const chunks = [];
                const pdfBufferPromise = new Promise((resolve, reject) => {
                    doc.on('data', chunk => chunks.push(chunk));
                    doc.on('end', () => resolve(Buffer.concat(chunks)));
                    doc.on('error', err => reject(err));
                });

                try {
                    // Add template background
                    doc.image(templateBuffer, 0, 0, { width: doc.page.width, height: doc.page.height });
                } catch (imgErr) {
                    fastify.log.error(imgErr);
                    return reply.code(400).send({ error: 'Template image format invalid. Please upload a valid PNG or JPG.' });
                }

                // Add Student Name - Centered vertically and horizontally (Customizable in future)
                doc.font('Helvetica-Bold').fontSize(40).fillColor('#1e293b');

                // Draw text in middle
                const textWidth = doc.widthOfString(studentName);
                const x = (doc.page.width - textWidth) / 2;
                const y = doc.page.height / 2.2;

                doc.text(studentName, x, y);

                doc.end();

                // Wait for PDF to finish
                const pdfBuffer = await pdfBufferPromise;

                zip.file(`${sub.student?.studentId || 'unknown'}_certificate.pdf`, pdfBuffer);
            }

            const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

            reply.header('Content-Type', 'application/zip');
            reply.header('Content-Disposition', `attachment; filename=${round.name.replace(/\s+/g, '_')}_certificates.zip`);
            return reply.send(zipBuffer);

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate certificates' });
        }
    });

    // 4. PATCH /api/superadmin/rounds/:roundId/release-certificates - TOGGLE RELEASE
    fastify.patch('/rounds/:roundId/release-certificates', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { roundId } = request.params;
            const { released, limit } = request.body;

            const round = await Round.findById(roundId);
            if (!round) return reply.code(404).send({ error: 'Round not found' });

            round.certificatesReleased = released !== undefined ? released : !round.certificatesReleased;
            if (limit !== undefined) round.winnerLimit = limit;

            await round.save();

            // Update hasCertificate flags for all submissions in this round
            // Clear all flags first
            await Submission.updateMany({ round: roundId }, { hasCertificate: false });

            if (round.certificatesReleased) {
                // Find Top N winners
                const winners = await Submission.find({
                    round: roundId,
                    status: { $in: ['SUBMITTED', 'COMPLETED'] }
                })
                    .sort({ score: -1 })
                    .limit(round.winnerLimit || 10)
                    .select('_id');

                const winnerIds = winners.map(w => w._id);
                if (winnerIds.length > 0) {
                    await Submission.updateMany(
                        { _id: { $in: winnerIds } },
                        { hasCertificate: true }
                    );
                }
            }

            await logActivity({
                action: 'UPDATED',
                performedBy: { userId: request.user?.userId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Round', id: roundId, label: `Certificates ${round.certificatesReleased ? 'RELEASED' : 'REVOKED'}` },
                ip: request.ip
            });

            return reply.code(200).send({
                success: true,
                message: `Certificates ${round.certificatesReleased ? 'released' : 'revoked'} successfully`,
                data: { certificatesReleased: round.certificatesReleased, winnerLimit: round.winnerLimit }
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to update certificate release status' });
        }
    });

    /**
     * GET /api/superadmin/team-requests
     * Returns all students who have a pending team enrollment request.
     */
    fastify.get('/team-requests', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const requests = await User.find({
                'teamRequest.status': 'PENDING',
                team: null,
                role: 'STUDENT'
            }).select('studentId name email department teamRequest createdAt').sort({ 'teamRequest.requestedAt': 1 });

            return reply.code(200).send({ success: true, data: requests });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch team requests' });
        }
    });

    /**
     * POST /api/superadmin/team-requests/:userId/assign
     * Admin assigns the student to a team — approves their request.
     * Body: { teamId: string }
     */
    fastify.post('/team-requests/:userId/assign', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { teamId } = request.body;

            if (!teamId) return reply.code(400).send({ error: 'teamId is required' });

            const [user, team] = await Promise.all([
                User.findById(userId),
                Team.findById(teamId)
            ]);

            if (!user) return reply.code(404).send({ error: 'User not found' });
            if (!team) return reply.code(404).send({ error: 'Team not found' });

            // Assign team on user document
            user.team = team._id;
            user.teamRequest = { status: 'APPROVED', message: null, requestedAt: user.teamRequest?.requestedAt };
            await user.save();

            // Add member to team (if not already)
            if (!team.members.includes(user._id)) {
                team.members.push(user._id);
                await team.save();
            }

            await logActivity({
                action: 'TEAM_ASSIGNED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'User', id: userId, label: `${user.studentId} assigned to team ${team.name}` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: `${user.studentId} assigned to team "${team.name}".` });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to assign team' });
        }
    });

    /**
     * POST /api/superadmin/team-requests/:userId/reject
     * Admin rejects the student's team enrollment request.
     * Body: { message?: string }
     */
    fastify.post('/team-requests/:userId/reject', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { userId } = request.params;
            const { message } = request.body || {};

            const user = await User.findById(userId);
            if (!user) return reply.code(404).send({ error: 'User not found' });

            user.teamRequest = {
                status: 'REJECTED',
                message: message || 'Your request was rejected by the admin.',
                requestedAt: user.teamRequest?.requestedAt
            };
            await user.save();

            await logActivity({
                action: 'TEAM_REQUEST_REJECTED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'User', id: userId, label: `${user.studentId} — Team request rejected` },
                ip: request.ip
            });

            return reply.code(200).send({ success: true, message: 'Request rejected.' });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to reject team request' });
        }
    });

    /**
     * POST /api/superadmin/sync-servers
     * Broadcasts a cache refresh to all student backend instances.
     * Auth: Super Admin
     */
    fastify.post('/sync-servers', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        const axios = require('axios');
        const urls = (process.env.STUDENT_BACKEND_URLS || '').split(',').filter(Boolean);
        const secret = process.env.SHARED_SECRET_KEY;

        if (!urls.length) {
            return reply.code(400).send({ success: false, error: 'No student backend URLs configured in .env' });
        }

        const outcomes = await Promise.allSettled(urls.map(async (url) => {
            const cleanUrl = url.trim();
            const res = await axios.post(`${cleanUrl}/api/internal/sync-cache`, {}, {
                headers: { 'Authorization': `Bearer ${secret}` },
                timeout: 5000
            });
            return { url: cleanUrl, status: 'success', message: res.data.message };
        }));

        const results = outcomes.map((outcome, index) => {
            if (outcome.status === 'fulfilled') return outcome.value;
            return {
                url: urls[index].trim(),
                status: 'error',
                error: outcome.reason.response?.data?.error || outcome.reason.message
            };
        });

        // Log result to platform activity log
        await logActivity({
            action: 'SYNC_SERVERS_TRIGGERED',
            performedBy: { 
                userId: request.user?.userId, 
                studentId: request.user?.studentId, 
                name: request.user?.name, 
                role: request.user?.role 
            },
            target: { type: 'System', id: 'cluster', label: `Sync on ${urls.length} nodes` },
            metadata: { results },
            ip: request.ip
        });

        return reply.send({ success: true, results });
    });

};
