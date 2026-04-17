const PDFDocument = require('pdfkit-table');

/**
 * Generates a stylized PDF buffer for an individual student's performance report.
 * 
 * @param {Object} student - The student user document (lean)
 * @param {Array} submissions - List of student submissions (lean, populated with round)
 * @returns {Promise<Buffer>}
 */
async function generateStudentReportBuffer(student, submissions) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const NAVY = '#1e293b';
            const PURPLE = '#581c87';
            const ACCENT = '#f59e0b';
            const LIGHT_BLUE = '#eff6ff';

            // --- Header ---
            doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF', { align: 'center' });
            doc.text('TECHNOLOGY', { align: 'center' });
            doc.moveDown(0.2);
            doc.fontSize(16).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
            doc.moveDown(0.5);

            const pageWidth = doc.page.width;
            doc.rect((pageWidth - 100) / 2, doc.y, 100, 3).fill(ACCENT);
            doc.moveDown(0.8);

            const pillWidth = 140;
            const pillX = (pageWidth - pillWidth) / 2;
            doc.roundedRect(pillX, doc.y, pillWidth, 24, 12).fill(NAVY);
            doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('C-CAP REPORT', pillX, doc.y + 7, { width: pillWidth, align: 'center' });
            doc.moveDown(1.5);

            doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
            doc.moveDown(1);

            // Title Box
            doc.roundedRect(40, doc.y, pageWidth - 80, 45, 8).fill(LIGHT_BLUE).strokeColor('#e2e8f0').stroke();
            doc.fillColor(NAVY).fontSize(18).text('PERFORMANCE ANALYTICS', 55, doc.y - 31);
            doc.moveDown(2.5);

            // --- Profile ---
            doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
            doc.fillColor(NAVY).fontSize(14).text('1. STUDENT PROFILE', 50, doc.y);
            doc.moveDown(0.8);

            const startY = doc.y;
            const drawField = (label, value, x, y) => {
                doc.fillColor('#64748b').fontSize(10).text(label.toUpperCase(), x, y);
                doc.fillColor(NAVY).fontSize(11).font('Helvetica-Bold').text(value || 'N/A', x, y + 14);
            };

            drawField('Candidate Name', student.name, 60, startY);
            drawField('Student Identity', student.studentId, pageWidth / 2 + 30, startY);
            doc.moveDown(2.5);

            const row2Y = doc.y;
            drawField('Team Assignment', student.team?.name || 'Independent', 60, row2Y);
            drawField('Department', student.department, pageWidth / 2 + 30, row2Y);
            doc.moveDown(3);

            // --- Table ---
            doc.fillColor(PURPLE).rect(40, doc.y, 4, 18).fill();
            doc.fillColor(NAVY).fontSize(14).text('2. ASSESSMENT RECORD', 50, doc.y);
            doc.moveDown(1);

            const table = {
                headers: [
                    { label: "ROUND", property: 'round', width: 200 },
                    { label: "STATUS", property: 'status', width: 100 },
                    { label: "SCORE", property: 'score', width: 80 },
                    { label: "DATE", property: 'updatedAt', width: 100 }
                ],
                rows: submissions.map(s => [
                    s.round?.name || 'Assesment',
                    s.status,
                    String(s.score || 0),
                    new Date(s.updatedAt).toLocaleDateString('en-IN')
                ])
            };

            doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor('#475569'),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(9).fillColor(NAVY);
                    if (indexRow % 2 === 0) doc.addBackground(rectRow, '#f8fafc', 0.5);
                }
            });

            const totalScore = submissions.reduce((sum, s) => sum + (s.score || 0), 0);
            doc.moveDown(2);
            doc.roundedRect(pageWidth - 220, doc.y, 180, 40, 8).fill(PURPLE);
            doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text('AGGREGATE SCORE', pageWidth - 210, doc.y + 14, { width: 100 });
            doc.fontSize(16).text(totalScore.toFixed(2), pageWidth - 100, doc.y - 14, { width: 70, align: 'right' });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Generates a stylized PDF buffer for a team's performance report.
 * 
 * @param {Object} team - The team document (populated with members)
 * @param {Array} memberStats - Array of { name, studentId, attended, score }
 * @param {Number} rank - Global rank of the team
 * @param {Number} totalScore - Aggregate score of the team
 * @returns {Promise<Buffer>}
 */
async function generateTeamReportBuffer(team, memberStats, rank, totalScore) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4' });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const NAVY = '#1e293b';
            const PURPLE = '#581c87';
            const ACCENT = '#f59e0b';
            const LIGHT_BLUE = '#eff6ff';

            // --- Header ---
            doc.font('Helvetica-Bold').fontSize(22).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF', { align: 'center' });
            doc.text('TECHNOLOGY', { align: 'center' });
            doc.moveDown(0.2);
            doc.fontSize(16).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
            doc.moveDown(0.5);

            const pageWidth = doc.page.width;
            doc.rect((pageWidth - 100) / 2, doc.y, 100, 3).fill(ACCENT);
            doc.moveDown(0.8);

            const chipWidth = 180;
            const chipX = (pageWidth - chipWidth) / 2;
            doc.roundedRect(chipX, doc.y, chipWidth, 24, 12).fill(NAVY);
            doc.fillColor('white').fontSize(10).font('Helvetica-Bold').text('TEAM PERFORMANCE REPORT', chipX, doc.y + 7, { width: chipWidth, align: 'center' });
            doc.moveDown(2);

            // --- Team Summary Box ---
            const infoY = doc.y;
            doc.roundedRect(40, infoY, pageWidth - 80, 70, 10).fill(LIGHT_BLUE).strokeColor('#e2e8f0').stroke();
            doc.fillColor(NAVY).fontSize(18).font('Helvetica-Bold').text(team.name.toUpperCase(), 60, infoY + 15);
            doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(`RANK #${rank} OVERALL`, 60, infoY + 38);

            doc.fillColor(PURPLE).fontSize(24).font('Helvetica-Bold').text(String(totalScore), pageWidth - 200, infoY + 15, { width: 140, align: 'right' });
            doc.fontSize(10).font('Helvetica-Bold').text('AGGREGATE POINTS', pageWidth - 200, infoY + 42, { width: 140, align: 'right' });
            doc.moveDown(4);

            // --- Squad Overview ---
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
                    String(m.attended || 0),
                    String(m.score || 0)
                ])
            };

            doc.table(table, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(10).fillColor(NAVY);
                    if (indexRow % 2 === 0) doc.addBackground(rectRow, LIGHT_BLUE, 0.4);
                }
            });

            // Footer
            doc.rect(40, doc.page.height - 60, pageWidth - 80, 6).fill(NAVY);

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

/**
 * Generates a comprehensive PDF buffer including student profile, performance summary, 
 * and detailed question-by-question breakdown for all rounds.
 * @param {Object} student - Student user object
 * @param {Array} submissions - List of submissions (contest + practice)
 * @param {Object} roundsData - Map of roundId -> questions (pre-fetched by round)
 * @param {Object} questionsMap - Global map of questionId -> question object (final fallback)
 */
async function generateDetailedSubmissionPDF(student, submissions, roundsData, questionsMap = {}) {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const NAVY = '#1e293b';
            const PURPLE = '#581c87';
            const ACCENT = '#f59e0b';
            const LIGHT_BLUE = '#eff6ff';
            const GREEN = '#059669';
            const RED = '#dc2626';

            // --- Header (First Page) ---
            const drawHeader = (title = 'INDIVIDUAL PERFORMANCE REPORT') => {
                doc.font('Helvetica-Bold').fontSize(18).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF TECHNOLOGY', { align: 'center' });
                doc.fontSize(14).fillColor(PURPLE).text('CODE CIRCLE CLUB', { align: 'center' });
                doc.moveDown(0.2);
                const pageWidth = doc.page.width;
                doc.rect((pageWidth - 60) / 2, doc.y, 60, 2).fill(ACCENT);
                doc.moveDown(0.5);
                doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold').text(title, { align: 'center' });
                doc.moveDown(1);
                doc.moveTo(40, doc.y).lineTo(pageWidth - 40, doc.y).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
                doc.moveDown(1);
            };

            drawHeader();

            // --- Section 1: Student Identity ---
            doc.fillColor(PURPLE).rect(40, doc.y, 4, 16).fill();
            doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold').text('STUDENT PROFILE', 50, doc.y - 1);
            doc.moveDown(0.8);

            const profileY = doc.y;
            const drawField = (label, value, x, y) => {
                doc.fillColor('#64748b').fontSize(8).text(label.toUpperCase(), x, y);
                doc.fillColor(NAVY).fontSize(10).font('Helvetica-Bold').text(value || 'N/A', x, y + 12);
            };

            drawField('Candidate Name', student.name, 60, profileY);
            drawField('Roll Number', student.studentId, 250, profileY);
            drawField('Department', student.department, 420, profileY);
            doc.fillColor('#94a3b8').fontSize(7).text(`(Debug: ${submissions.length} valid sessions found)`, 420, profileY + 25);
            doc.moveDown(3);

            // --- Section 2: Summary Table ---
            doc.fillColor(PURPLE).rect(40, doc.y, 4, 16).fill();
            doc.fillColor(NAVY).fontSize(12).font('Helvetica-Bold').text('ASSESSMENT SUMMARY', 50, doc.y - 1);
            doc.moveDown(1);

            const summaryTable = {
                headers: [
                    { label: "ROUND TITLE", property: 'round', width: 220 },
                    { label: "STATUS", property: 'status', width: 100 },
                    { label: "AUTO", property: 'auto', width: 60 },
                    { label: "MANUAL", property: 'manual', width: 60 },
                    { label: "TOTAL", property: 'total', width: 75 }
                ],
                rows: submissions.map(s => {
                    const manualScore = (s.manualScores || []).reduce((sum, m) => sum + (m.score || 0), 0);
                    return [
                        s.round?.name || 'Untitled Round',
                        s.status,
                        String(s.autoScore || 0),
                        String(manualScore),
                        String(s.score || 0)
                    ];
                })
            };

            await doc.table(summaryTable, {
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(9).fillColor('#475569'),
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica").fontSize(9).fillColor(NAVY);
                }
            });

            // --- Section 3: Detailed Breakdown ---
            if (submissions.length === 0) {
                doc.addPage();
                doc.fillColor('#94a3b8').fontSize(12).text('No valid assessment submissions found for this student.', { align: 'center' });
            }

            for (let sIdx = 0; sIdx < submissions.length; sIdx++) {
                const sub = submissions[sIdx];
                doc.addPage();
                drawHeader(`DETAILED BREAKDOWN: ${sub.round?.name || 'Round'}`);
                
                // Debugging info on each detail page
                doc.fillColor('#e2e8f0').fontSize(6).text(`Debug: SessionID=${sub._id} | RoundsMatched=${!!roundsData[sub.round?._id?.toString()]} | AssignedCount=${sub.assignedQuestions?.length || 0}`, 40, doc.y);
                doc.moveDown(1);

                
                // Prioritize assignedQuestions (populated) > roundsData (pre-fetched by round) > questionsMap (global search)
                let questions = (sub.assignedQuestions && sub.assignedQuestions.length > 0 && typeof sub.assignedQuestions[0] === 'object')
                    ? sub.assignedQuestions
                    : (roundsData[sub.round?._id?.toString()] || []);

                // If still empty, try resolving from assignedQuestions IDs via global map
                if (questions.length === 0 && sub.assignedQuestions && sub.assignedQuestions.length > 0) {
                    questions = sub.assignedQuestions.map(qId => questionsMap[qId.toString()]).filter(Boolean);
                }

                // If STILL empty, perform a global filter on the questionsMap by round ID
                if (questions.length === 0 && sub.round?._id) {
                    const rIdStr = sub.round._id.toString();
                    questions = Object.values(questionsMap).filter(q => 
                        (q.round?.toString() === rIdStr) || 
                        (q.linkedRounds || []).some(lr => lr.toString() === rIdStr)
                    );
                }
                let studentAnswers = {};
                try {
                    const rawContent = (sub.codeContent || '').trim();
                    if (rawContent.startsWith('{') || rawContent.startsWith('[')) {
                        const parsed = JSON.parse(rawContent);
                        if (Array.isArray(parsed)) {
                            // If it's an array of { questionId, answer }, convert to map
                            parsed.forEach(item => {
                                if (item.questionId) studentAnswers[item.questionId] = item.answer || item.code;
                                else if (item.question) studentAnswers[item.question] = item.answer;
                            });
                        } else if (typeof parsed === 'object') {
                            studentAnswers = parsed;
                        }
                    }
                } catch (e) { }

                if (questions.length === 0) {
                    doc.fillColor('#94a3b8').fontSize(10).font('Helvetica-Oblique').text(`No questioning details available for this round configuration (${sub.round?._id || 'No Round ID'}).`, { align: 'center' });
                    doc.text('Check if the questions are properly linked to this round in the database.', { align: 'center' });
                    continue;
                }

                doc.fillColor('#64748b').fontSize(8).text(`${questions.length} questions identified for this session.`, { align: 'right' });
                doc.moveDown(0.5);

                for (let i = 0; i < questions.length; i++) {
                    const q = questions[i] || {};
                    const qId = (q._id || q).toString();
                    const qTitle = q.title || questionsMap[qId]?.title || 'Question';
                    const qPoints = q.points || questionsMap[qId]?.points || 0;
                    const qType = q.type || questionsMap[qId]?.type || 'UNKNOWN';
                    const qCorrect = q.correctAnswer || questionsMap[qId]?.correctAnswer || '';
                    
                    // Priority: JSON mapping > codeContent fallback (for single code question rounds)
                    let sAns = studentAnswers[qId];
                    if (sAns === undefined || sAns === null) {
                        // If it's the only question in the round or round is a code round, use whole codeContent
                        if (q.type === 'CODE' || questions.length === 1) {
                            sAns = sub.codeContent;
                        }
                    }

                    const hasAnswer = sAns !== undefined && sAns !== null && String(sAns).trim() !== '';
                    const manualEval = (sub.manualScores || []).find(m => m.questionId?.toString() === qId);
                    
                    // Box for each question
                    const startBoxY = doc.y;
                    doc.fillColor(LIGHT_BLUE).rect(40, startBoxY, doc.page.width - 80, 20).fill();
                    doc.fillColor(PURPLE).fontSize(9).font('Helvetica-Bold').text(`QUESTION ${i + 1}: ${qTitle}`, 50, startBoxY + 6);
                    doc.fillColor(NAVY).fontSize(9).font('Helvetica').text(`Points: ${qPoints} | Type: ${qType}`, doc.page.width - 180, startBoxY + 6, { align: 'right', width: 130 });
                    doc.moveDown(1.5);

                    // Answer Details
                    const lineY = doc.y;
                    doc.fillColor('#64748b').fontSize(8).text('STUDENT ANSWER:', 55, lineY);
                    
                    doc.moveDown(0.5);
                    const answerY = doc.y;
                    if (qType === 'MCQ') {
                        const isCorrect = hasAnswer && String(sAns).trim().toLowerCase() === String(qCorrect).trim().toLowerCase();
                        doc.fillColor(hasAnswer ? (isCorrect ? GREEN : RED) : '#94a3b8')
                           .fontSize(10).font('Helvetica-Bold')
                           .text(hasAnswer ? String(sAns) : 'Not Answered', 65, answerY);
                        if (hasAnswer && !isCorrect) {
                            doc.fillColor('#64748b').fontSize(8).font('Helvetica').text(` (Correct: ${qCorrect})`, doc.x + 10, answerY + 2, { lineBreak: false });
                        }
                    } else if (qType === 'CODE' || qType === 'DEBUG' || qType === 'UI_UX') {
                      doc.fillColor('#0f172a').font('Courier').fontSize(8).text(hasAnswer ? String(sAns) : '// No submission found', 65, answerY, { width: doc.page.width - 120 });
                    } else {
                      doc.fillColor(NAVY).font('Helvetica').fontSize(9).text(hasAnswer ? String(sAns) : 'No response provided', 65, answerY, { width: doc.page.width - 120 });
                    }
                    
                    doc.moveDown(1);
                    if (manualEval) {
                        doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold').text(`Admin Score: ${manualEval.score} / ${qPoints}`, 55, doc.y);
                        if (manualEval.feedback) {
                            doc.fillColor('#475569').fontSize(8).font('Helvetica-Oblique').text(`Feedback: ${manualEval.feedback}`, 65, doc.y + 1);
                        }
                        doc.moveDown(1.5);
                    } else if (qType === 'MCQ') {
                      const isCorrect = String(sAns).trim().toLowerCase() === String(qCorrect).trim().toLowerCase();
                      doc.fillColor(isCorrect ? GREEN : RED).fontSize(9).font('Helvetica-Bold').text(`Auto Score: ${isCorrect ? qPoints : 0} / ${qPoints}`, 55, doc.y);
                      doc.moveDown(1.5);
                    } else {
                      doc.moveDown(0.5);
                    }

                    // Separation line
                    doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke();
                    doc.moveDown(1);

                    // Page break safety
                    if (doc.y > doc.page.height - 100) {
                        doc.addPage();
                        drawHeader(`DETAILED BREAKDOWN: ${sub.round?.name || 'Round'} (Cont.)`);
                    }
                }
            }


            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    generateStudentReportBuffer,
    generateTeamReportBuffer,
    generateDetailedSubmissionPDF
};

