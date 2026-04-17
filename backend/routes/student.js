const User = require('../models/User');
const Submission = require('../models/Submission');
const Team = require('../models/Team');
const Question = require('../models/Question');
const PracticeSubmission = require('../models/PracticeSubmission');
const PDFDocument = require('pdfkit-table');

module.exports = async function (fastify, opts) {
    /**
     * GET /api/student/my-report
     * Download the student's own performance report if published.
     */
    fastify.get('/my-report', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const student = await User.findById(userId).populate('team').lean();
            if (!student) return reply.code(404).send({ error: 'Student not found' });
            
            if (!student.isReportPublished) {
                return reply.code(403).send({ error: 'Your performance report has not been published yet.' });
            }

            const [contestSubmissions, practiceSubmissions] = await Promise.all([
                Submission.find({ student: userId }).populate('round').populate('assignedQuestions').lean(),
                PracticeSubmission.find({ student: userId }).populate('round').populate('assignedQuestions').lean()
            ]);
      

            const allSubmissions = [...contestSubmissions, ...practiceSubmissions].filter(s => s.status !== 'NOT_STARTED');
            
            // Map round data for detail rendering
            const roundIds = [...new Set(allSubmissions.map(s => s.round?._id?.toString()).filter(Boolean))];
            const roundsData = {};
            for (const rId of roundIds) {
                roundsData[rId] = await Question.find({ 
                    $or: [{ round: rId }, { linkedRounds: rId }]
                }).lean();
            }

            // Build a comprehensive question cache for the generator
            const allRelatedQuestions = await Question.find({}).lean();
            const questionsMap = {};
            allRelatedQuestions.forEach(q => {
                questionsMap[q._id.toString()] = q;
            });

            const { generateDetailedSubmissionPDF } = require('../utils/reportGenerator');
            const pdfBuffer = await generateDetailedSubmissionPDF(student, allSubmissions, roundsData, questionsMap);

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

            const pdfBuffer = await generateTeamReportBuffer(team);
            
            reply.type('application/pdf');
            reply.header('Content-Disposition', `attachment; filename=${team.name.replace(/\s+/g, '_')}_Team_Report.pdf`);
            return reply.send(pdfBuffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate team report' });
        }
    });

    // ─── SLOT TIMING (Student-Facing) ──────────────────────────────────────────

    const Slot = require('../models/Slot');
    const SlotChangeRequest = require('../models/SlotChangeRequest');

    /**
     * GET /api/student/my-slots
     * Get the current student's assigned slots (via their team) for all rounds.
     */
    fastify.get('/my-slots', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const student = await User.findById(userId).select('team').lean();

            if (!student?.team) {
                return reply.send({ success: true, data: [] });
            }

            const slots = await Slot.find({ teams: student.team })
                .populate('round', 'name status startTime endTime durationMinutes')
                .sort({ startTime: 1 });

            return reply.send({ success: true, data: slots });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch slots' });
        }
    });

    /**
     * POST /api/student/slot-change-request
     * Submit a request to change to a different slot.
     */
    fastify.post('/slot-change-request', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const { roundId, currentSlotId, requestedSlotId, reason } = request.body;

            if (!roundId || !currentSlotId || !requestedSlotId || !reason) {
                return reply.code(400).send({ error: 'roundId, currentSlotId, requestedSlotId, and reason are required' });
            }

            if (currentSlotId === requestedSlotId) {
                return reply.code(400).send({ error: 'Requested slot must be different from current slot' });
            }

            // Check for existing pending request for this round
            const existing = await SlotChangeRequest.findOne({
                student: userId,
                round: roundId,
                status: 'PENDING'
            });

            if (existing) {
                return reply.code(400).send({ error: 'You already have a pending slot change request for this round' });
            }

            // Verify both slots exist and belong to the same round
            const [currentSlot, requestedSlot] = await Promise.all([
                Slot.findById(currentSlotId),
                Slot.findById(requestedSlotId)
            ]);

            if (!currentSlot || !requestedSlot) {
                return reply.code(404).send({ error: 'One or both slots not found' });
            }

            if (currentSlot.round.toString() !== roundId || requestedSlot.round.toString() !== roundId) {
                return reply.code(400).send({ error: 'Slots must belong to the specified round' });
            }

            const changeRequest = new SlotChangeRequest({
                student: userId,
                round: roundId,
                currentSlot: currentSlotId,
                requestedSlot: requestedSlotId,
                reason: reason.trim()
            });

            await changeRequest.save();

            return reply.code(201).send({ success: true, data: changeRequest });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to submit slot change request' });
        }
    });

    /**
     * GET /api/student/my-slot-change-requests
     * View status of submitted slot change requests.
     */
    fastify.get('/my-slot-change-requests', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        try {
            const userId = request.user.userId;
            const requests = await SlotChangeRequest.find({ student: userId })
                .populate('round', 'name')
                .populate('currentSlot', 'label startTime endTime')
                .populate('requestedSlot', 'label startTime endTime')
                .sort({ createdAt: -1 });

            return reply.send({ success: true, data: requests });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch slot change requests' });
        }
    });
};

// --- Helper Functions ---

async function generateTeamReportBuffer(team) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const NAVY = '#1e293b';
            const PURPLE = '#581c87';
            const AMBER = '#f59e0b';
            const LIGHT_BLUE = '#eff6ff';

            // Header
            doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF', { align: 'center' });
            doc.text('TECHNOLOGY', { align: 'center' });
            doc.moveDown(0.2);
            doc.fontSize(16).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
            doc.moveDown(0.5);
            const pageWidth = doc.page.width;
            doc.rect((pageWidth - 100) / 2, doc.y, 100, 3).fill(AMBER);
            doc.moveDown(0.8);
            const chipWidth = 240;
            const chipHeight = 24;
            const chipX = (pageWidth - chipWidth) / 2;
            doc.roundedRect(chipX, doc.y, chipWidth, chipHeight, 12).fill(NAVY);
            doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('TEAM PERFORMANCE ANALYTICS', chipX, doc.y + 9, { width: chipWidth, align: 'center' });
            doc.moveDown(2);

            // Fetch submissions for all members
            const memberIds = team.members.map(m => m._id);
            const [contestSubmissions, practiceSubmissions] = await Promise.all([
                Submission.find({ student: { $in: memberIds } }).lean(),
                PracticeSubmission.find({ student: { $in: memberIds } }).lean()
            ]);

            const memberStats = team.members.map(member => {
                const memberContests = contestSubmissions.filter(s => s.student.toString() === member._id.toString());
                const memberPractice = practiceSubmissions.filter(s => s.student.toString() === member._id.toString());
                
                const contestScore = memberContests.reduce((sum, s) => sum + (s.score || 0), 0);
                const practiceScore = memberPractice.reduce((sum, s) => sum + (s.score || 0), 0);
                const totalScore = contestScore + practiceScore;

                return { 
                    name: member.name, 
                    studentId: member.studentId, 
                    contestScore, 
                    practiceScore, 
                    totalScore 
                };
            });

            const teamTotalScore = memberStats.reduce((sum, s) => sum + s.totalScore, 0);

            // Team Info Box
            const infoY = doc.y;
            doc.roundedRect(40, infoY, pageWidth - 80, 70, 10).fill(LIGHT_BLUE).strokeColor('#e2e8f0').stroke();
            doc.fillColor(NAVY).fontSize(18).font('Helvetica-Bold').text(team.name.toUpperCase(), 60, infoY + 15);
            doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`TEAM SQUAD COMPOSITION`, 60, infoY + 38);
            doc.fillColor(PURPLE).fontSize(24).font('Helvetica-Bold').text(teamTotalScore.toFixed(2), pageWidth - 200, infoY + 15, { width: 140, align: 'right' });
            doc.fontSize(10).font('Helvetica-Bold').fillColor(PURPLE).text('AGGREGATE TEAM POINTS', pageWidth - 200, infoY + 42, { width: 140, align: 'right' });
            doc.moveDown(4);

            // 1. MEMBER CONTRIBUTION BREAKDOWN
            doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
            doc.fillColor(NAVY).fontSize(14).font('Helvetica-Bold').text('1. MEMBER CONTRIBUTION BREAKDOWN', 50, doc.y);
            doc.moveDown(1);

            const table = {
                headers: [
                    { label: "Roll Number", property: 'studentId', width: 90 },
                    { label: "Member Name", property: 'name', width: 160 },
                    { label: "Contest Pts", property: 'contest', width: 80 },
                    { label: "Practice Pts", property: 'practice', width: 80 },
                    { label: "Total Contrib.", property: 'total', width: 100 }
                ],
                rows: memberStats.map(m => [
                    m.studentId,
                    m.name,
                    m.contestScore.toFixed(1),
                    m.practiceScore.toFixed(1),
                    m.totalScore.toFixed(1)
                ])
            };

            await doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor(NAVY),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(9).fillColor(NAVY);
                }
            });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}
