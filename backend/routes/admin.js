const fp = require('fastify-plugin');
const multipart = require('@fastify/multipart');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { parse } = require('json2csv');
const User = require('../models/User');
const { logActivity } = require('../utils/logger');

module.exports = async function (fastify, opts) {

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
