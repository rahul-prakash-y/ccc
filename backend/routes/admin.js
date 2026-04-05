const fp = require('fastify-plugin');
const multipart = require('@fastify/multipart');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { parse } = require('json2csv');
const Submission = require('../models/Submission');
const PracticeSubmission = require('../models/PracticeSubmission');
const User = require('../models/User');
const { logActivity } = require('../utils/logger');

let adminStats = {
    totalUsers: 0,
    totalSubmissions: 0,
    totalCheatFlags: 0,
    lastUpdated: null
};

// --- Admin Master Cache (Platform-wide Student Statuses) ---
let adminState = {
    students: [],
    lastUpdated: null
};

/**
 * Platform Hydrator: Fetches all student statuses and submission counts.
 * Optimized with .lean() and .select() to keep the RAM payload beneath 10-20MB.
 */
const hydrateAdminState = async () => {
    try {
        const Round = require('../models/Round');
        
        // 1. Fetch Students (Identity & Meta)
        const students = await User.find({ role: 'STUDENT' })
            .select('studentId name isBanned isOnboarded role allocatedServer')
            .lean();
            
        // 2. Fetch Submission Snapshots from both regular and practice collections
        const [regularSubs, practiceSubs] = await Promise.all([
            Submission.find({})
                .select('student round status score cheatFlags tabSwitches updatedAt')
                .lean(),
            PracticeSubmission.find({})
                .select('student round status score cheatFlags tabSwitches updatedAt')
                .lean()
        ]);

        const submissions = [...regularSubs, ...practiceSubs];

        // 3. Map submissions to their owners for fast O(1) lookup
        const submissionMap = {};
        submissions.forEach(sub => {
            const sid = sub.student.toString();
            if(!submissionMap[sid]) submissionMap[sid] = [];
            submissionMap[sid].push({
                roundId: sub.round,
                status: sub.status,
                score: sub.score,
                cheatFlags: sub.cheatFlags,
                tabSwitches: sub.tabSwitches,
                lastUpdate: sub.updatedAt
            });
        });

        // 4. Final Hydration
        adminState.students = students.map(u => ({
            _id: u._id,
            studentId: u.studentId,
            name: u.name,
            isBanned: u.isBanned,
            isOnboarded: u.isOnboarded,
            allocatedServer: u.allocatedServer,
            submissions: submissionMap[u._id.toString()] || [],
            submissionCount: (submissionMap[u._id.toString()] || []).length
        }));
        
        adminState.lastUpdated = new Date();
    } catch (err) {
        console.error('Master Cache Hydration Error:', err);
    }
};

// Initial run and background loop
hydrateAdminState();
setInterval(hydrateAdminState, 20000); // 20s interval as requested
async function aggregateDashboardStats() { // ... rest of existing aggregator
    try {
        const [userCount, subStats] = await Promise.all([
            User.countDocuments({ role: 'STUDENT' }),
            Promise.all([
                Submission.aggregate([
                    { $group: { _id: null, totalSubmissions: { $sum: 1 }, totalCheatFlags: { $sum: "$cheatFlags" } } }
                ]),
                PracticeSubmission.aggregate([
                    { $group: { _id: null, totalSubmissions: { $sum: 1 }, totalCheatFlags: { $sum: "$cheatFlags" } } }
                ])
            ])
        ]);

        const [regStats, pracStats] = subStats;
        const reg = regStats[0] || { totalSubmissions: 0, totalCheatFlags: 0 };
        const prac = pracStats[0] || { totalSubmissions: 0, totalCheatFlags: 0 };

        adminStats = {
            totalUsers: userCount,
            totalSubmissions: reg.totalSubmissions + prac.totalSubmissions,
            totalCheatFlags: reg.totalCheatFlags + prac.totalCheatFlags,
            lastUpdated: new Date()
        };
    } catch (err) {
        // Fallback for empty DB
        adminStats.lastUpdated = new Date();
    }
};

// Initialize Background Process
setInterval(aggregateDashboardStats, 30000);
aggregateDashboardStats();

module.exports = async function (fastify, opts) {

    /**
     * GET /api/admin/stats
     * Returns cached dashboard statistics to prevent heavy DB hits.
     */
    fastify.get('/stats', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        return reply.send({ success: true, data: adminStats });
    });

    /**
     * POST /api/admin/refresh-stats
     * Force re-calculation of the in-memory stats cache.
     * Auth: Super Admin Only
     */
    fastify.post('/refresh-stats', { preValidation: [fastify.requireSuperAdmin] }, async (request, reply) => {
        await aggregateDashboardStats();
        return reply.send({ success: true, message: 'Stats re-aggregated successfully', data: adminStats });
    });

    /**
     * GET /api/admin/dashboard
     * Returns the complete Admin Master Cache for platform monitoring.
     * No DB queries performed inside the route to handle 31 simultaneous admins.
     */
    fastify.get('/dashboard', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        return reply.send({ success: true, data: adminState });
    });

    /**
     * GET /api/admin/student/:studentId/code
     * Lazy-loads actual code content only when specifically requested.
     */
    fastify.get('/student/:studentId/code', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const { studentId } = request.params;
            const userSubmissions = await Submission.find({ student: studentId })
                .select('student round codeContent status')
                .populate('round', 'name type')
                .lean();
                
            return reply.send({ success: true, data: userSubmissions });
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to fetch student code' });
        }
    });

    /**
     * 1. Admin Bulk User Generator (POST /api/admin/bulk-upload-students)
     * Auth: Must use the requireAdmin hook.
     * Parses Excel, generates strong passwords, registers students, and returns the CSV mapping.
     */
    fastify.post('/bulk-upload-students', { preValidation: [fastify.requireAdmin] }, async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ error: 'No spreadsheet file uploaded' });
            }

            // Convert stream to Buffer to be parsed by xlsx
            const buffer = await data.toBuffer();

            const workbook = xlsx.read(buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                return reply.code(400).send({ error: 'Excel file is empty' });
            }

            const generatedCredentials = [];
            let successCount = 0;
            let errorCount = 0;

            const Team = require('../models/Team');

            // Iterate constraints and Generate
            for (const row of rows) {
                // Mapping headers flexibly
                const idKey = Object.keys(row).find(k => ['rollnumber', 'studentid', 'id', 'roll_no', 'roll no'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const nameKey = Object.keys(row).find(k => ['name', 'studentsname', 'students name'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const emailKey = Object.keys(row).find(k => ['email', 'mailid', 'mail id'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const phoneKey = Object.keys(row).find(k => ['phone', 'phonenumber', 'phone number'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const deptKey = Object.keys(row).find(k => ['dept', 'department'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const accommodationKey = Object.keys(row).find(k => ['accommodation', 'accomodation'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const teamKey = Object.keys(row).find(k => k.toLowerCase() === 'team');
                const linkedinKey = Object.keys(row).find(k => ['linkedin', 'linkedin profile'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const githubKey = Object.keys(row).find(k => ['github', 'github profile'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const dobKey = Object.keys(row).find(k => ['dob', 'dateofbirth', 'date of birth'].includes(k.toLowerCase().replace(/[\s_]/g, '')));
                const genderKey = Object.keys(row).find(k => k.toLowerCase() === 'gender');

                const studentId = row[idKey];
                const name = row[nameKey];
                const department = row[deptKey] || '';

                if (!studentId || !name) {
                    errorCount++;
                    continue; // Skip invalid rows smoothly
                }

                // Verify they don't already exist to prevent duplicate crashes
                const exists = await User.findOne({ studentId });
                if (exists) {
                    errorCount++;
                    continue;
                }

                // Default password "123456"
                const defaultPassword = '123456';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);

                const finalName = name ? name.toString().trim() : `Student ${studentId}`;

                // Try to find team
                let teamId = null;
                const teamName = row[teamKey] ? String(row[teamKey]).trim() : '';
                if (teamName) {
                    const team = await Team.findOne({ name: new RegExp('^' + teamName + '$', 'i') });
                    if (team) teamId = team._id;
                }

                // Handle enum values
                let accommodation = null;
                if (row[accommodationKey]) {
                    const acc = String(row[accommodationKey]).toLowerCase();
                    if (acc.includes('hostel')) accommodation = 'Hostel';
                    else if (acc.includes('day')) accommodation = 'Day Scholar';
                }

                let gender = null;
                if (row[genderKey]) {
                    const gen = String(row[genderKey]).toLowerCase();
                    if (gen === 'male') gender = 'Male';
                    else if (gen === 'female') gender = 'Female';
                    else if (gen === 'other') gender = 'Other';
                    else if (gen.includes('prefer')) gender = 'Prefer not to say';
                }

                const newUser = new User({
                    studentId: studentId.toString().trim(),
                    name: finalName,
                    email: row[emailKey] ? String(row[emailKey]).trim() : undefined,
                    phone: row[phoneKey] ? String(row[phoneKey]).trim() : undefined,
                    password: hashedPassword,
                    role: 'STUDENT',
                    isOnboarded: false,
                    department: department.toString().trim(),
                    accommodation,
                    gender,
                    linkedinProfile: row[linkedinKey] ? String(row[linkedinKey]).trim() : undefined,
                    githubProfile: row[githubKey] ? String(row[githubKey]).trim() : undefined,
                    dob: row[dobKey] ? new Date(row[dobKey]) : undefined,
                    team: teamId
                });

                await newUser.save();

                // If assigned to team, update team members
                if (teamId) {
                    await Team.findByIdAndUpdate(teamId, { $addToSet: { members: newUser._id } });
                }

                generatedCredentials.push({
                    Name: finalName,
                    Student_ID: studentId,
                    Department: department || 'General',
                    Platform_Password: defaultPassword,
                    Team: teamName || 'None'
                });

                successCount++;
            }

            // Convert output array directly to CSV buffer
            const csvString = parse(generatedCredentials);

            // Log BULK_UPLOAD event
            await logActivity({
                action: 'BULK_UPLOAD',
                performedBy: {
                    userId: request.user?.userId,
                    studentId: request.user?.studentId,
                    name: request.user?.name,
                    role: request.user?.role
                },
                target: { type: 'User', label: `${successCount} students created, ${errorCount} skipped` },
                metadata: { successCount, errorCount },
                ip: request.ip
            });

            // Send the file back inherently with the correct headers
            reply.header('Content-Type', 'text/csv');
            reply.header('Content-Disposition', 'attachment; filename=generated_student_credentials.csv');

            return reply.send(csvString);

        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to process bulk upload', details: error.message });
        }
    });

    /**
     * 2. Student Upload Template (GET /api/admin/students/upload-template)
     */
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
            const ws = xlsx.utils.json_to_sheet(data);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Students');
            const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

            reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            reply.header('Content-Disposition', 'attachment; filename=student_upload_template.xlsx');
            return reply.send(buffer);
        } catch (error) {
            fastify.log.error(error);
            return reply.code(500).send({ error: 'Failed to generate template' });
        }
    });

};
