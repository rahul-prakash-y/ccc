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
                order, type, category, options, correctAnswer
            } = request.body;

            if (!title || !description) {
                return reply.code(400).send({ error: 'Title and description are required' });
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
                correctAnswer: correctAnswer || ''
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
            const { studentId, name, password } = request.body;
            if (!studentId || !name || !password) {
                return reply.code(400).send({ error: 'studentId, name, and password are required' });
            }
            const exists = await User.findOne({ studentId });
            if (exists) return reply.code(409).send({ error: 'User with this ID already exists' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const student = new User({ studentId, name, password: hashedPassword, role: 'STUDENT' });
            await student.save();

            await logActivity({
                action: 'CREATED',
                performedBy: { userId: request.user?.userId, studentId: request.user?.studentId, name: request.user?.name, role: request.user?.role },
                target: { type: 'Student', id: student._id.toString(), label: `${student.studentId} (${student.name})` },
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
