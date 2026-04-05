const User = require('../models/User');
const Submission = require('../models/Submission');
const Team = require('../models/Team');
const { generateStudentReportBuffer, generateTeamReportBuffer } = require('../utils/reportGenerator');

module.exports = async function (fastify, opts) {
    /**
     * GET /api/student/my-report
     * Download the student's own performance report if published.
     */
    fastify.get('/my-report', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const student = await User.findById(userId).populate('team').lean();
            
            if (!student.isReportPublished) {
                return reply.code(403).send({ error: 'Your performance report has not been published yet.' });
            }

            const submissions = await Submission.find({ student: userId })
                .populate('round')
                .sort({ 'round.createdAt': 1 })
                .lean();

            const pdfBuffer = await generateStudentReportBuffer(student, submissions);
            
            reply.type('application/pdf');
            reply.header('Content-Disposition', `attachment; filename=${student.studentId}_Report.pdf`);
            return reply.send(pdfBuffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate report' });
        }
    });

    /**
     * GET /api/student/my-team-report
     * Download the team's performance report if published.
     */
    fastify.get('/my-team-report', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const student = await User.findById(userId).populate('team').lean();
            
            if (!student.team) {
                return reply.code(404).send({ error: 'You are not assigned to any team.' });
            }

            const team = await Team.findById(student.team._id).populate('members').lean();
            
            if (!team.isReportPublished) {
                return reply.code(403).send({ error: 'The team performance report has not been published yet.' });
            }

            // Fetch submissions for all members to calculate rank/stats properly
            const memberIds = team.members.map(m => m._id);
            const allSubmissions = await Submission.find({ student: { $in: memberIds } }).lean();

            const memberStats = team.members.map(member => {
                const memberSubs = allSubmissions.filter(s => s.student.toString() === member._id.toString());
                const totalScore = memberSubs.reduce((sum, s) => sum + (s.score || 0), 0);
                const attended = memberSubs.filter(s => s.status !== 'NOT_STARTED').length;
                return { name: member.name, studentId: member.studentId, attended, score: totalScore };
            });

            const teamTotalScore = memberStats.reduce((sum, s) => sum + s.score, 0);

            // Fetch a simplified set of teams for global ranking
            const allTeams = await Team.find({}).populate('members').select('_id name members').lean();

            // Calculate global rank
            const teamSubmissionsAgg = await Submission.find({ student: { $in: allTeams.flatMap(t => t.members.map(m => m._id)) } }).select('student score').lean();
            const scores = allTeams.map(t => {
                const teamSubmissions = teamSubmissionsAgg.filter(s => t.members.some(m => m._id.toString() === s.student.toString()));
                return { id: t._id.toString(), totalScore: teamSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) };
            }).sort((a, b) => b.totalScore - a.totalScore);

            const rank = scores.findIndex(s => s.id === team._id.toString()) + 1;

            const pdfBuffer = await generateTeamReportBuffer(team, memberStats, rank, teamTotalScore);
            
            reply.type('application/pdf');
            reply.header('Content-Disposition', `attachment; filename=${team.name.replace(/\s+/g, '_')}_Team_Report.pdf`);
            return reply.send(pdfBuffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate team report' });
        }
    });
};
