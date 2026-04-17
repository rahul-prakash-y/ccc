const PDFDocument = require('pdfkit-table');

/**
 * Generates a stylized PDF buffer for a Club Event Report based on the provided data.
 * 
 * @param {Object} data - The event report data
 * @returns {Promise<Buffer>}
 */
async function generateClubEventReportBuffer(data) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ 
                margin: 50, 
                size: 'A4',
                bufferPages: true 
            });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const NAVY = '#1e293b';
            const PURPLE = '#581c87';
            const ACCENT = '#f59e0b';
            const SLATE = '#64748b';
            const LIGHT_BLUE = '#f8fafc';

            // --- BIT Header ---
            const drawHeader = () => {
                doc.font('Helvetica-Bold').fontSize(16).fillColor(NAVY).text('BANNARI AMMAN INSTITUTE OF TECHNOLOGY', { align: 'center' });
                doc.fontSize(12).fillColor(SLATE).text('(An Autonomous Institution Affiliated to Anna University, Chennai)', { align: 'center' });
                doc.text('SATHYAMANGALAM – 638 401', { align: 'center' });
                doc.moveDown(0.5);
                doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor('#cbd5e1').lineWidth(1).stroke();
                doc.moveDown(1);
            };

            drawHeader();

            // --- Report Title ---
            doc.font('Helvetica-Bold').fontSize(14).fillColor(PURPLE).text(`REPORT ON "${(data.eventTitle || 'TITLE OF THE EVENT').toUpperCase()}"`, { align: 'center' });
            doc.moveDown(1.5);

            // --- Basic Details Table ---
            const primaryDetails = [
                ['Name of the Club', data.clubName || 'Code Circle Club'],
                ['Event Category', data.category || 'Workshop/Seminar/Outreach'],
                ['Academic Year', data.academicYear || '2023-24'],
                ['Date', data.date || 'N/A'],
                ['Venue', data.venue || 'N/A']
            ];

            const detailTable = {
                rows: primaryDetails
            };

            doc.table(detailTable, {
                prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                    doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY);
                    if (indexColumn === 1) doc.font("Helvetica").fillColor(SLATE);
                },
                hideHeader: true,
                width: 500,
                x: 50
            });

            doc.moveDown(1.5);

            // --- Objective ---
            doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Objective of the event:');
            doc.font('Helvetica').fontSize(10).fillColor(SLATE).text(data.objective || 'N/A', { align: 'justify' });
            doc.moveDown(1);

            // --- Outcome ---
            doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Outcome of the event:');
            doc.font('Helvetica').fontSize(10).fillColor(SLATE).text(data.outcome || 'N/A', { align: 'justify' });
            doc.moveDown(1.5);

            // --- Attachments (Brochure & Circular) ---
            if (data.brochure || data.circular) {
                doc.addPage();
                drawHeader();
                doc.font('Helvetica-Bold').fontSize(12).fillColor(PURPLE).text('ATTACHMENTS (BROCHURE & CIRCULAR)', { align: 'center' });
                doc.moveDown(1);

                if (data.brochure) {
                    try {
                        doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Event Brochure:');
                        doc.image(data.brochure, { fit: [500, 300], align: 'center' });
                        doc.moveDown(1);
                    } catch (e) {
                        doc.text('[Invalid Brochure Image Format]', { color: 'red' });
                    }
                }

                if (data.circular) {
                    if (doc.y > 450) doc.addPage();
                    try {
                        doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text('Event Circular:');
                        doc.image(data.circular, { fit: [500, 300], align: 'center' });
                        doc.moveDown(1);
                    } catch (e) {
                        doc.text('[Invalid Circular Image Format]', { color: 'red' });
                    }
                }
            }

            // --- Attendance Section ---
            doc.addPage();
            drawHeader();
            doc.font('Helvetica-Bold').fontSize(12).fillColor(PURPLE).text('ATTENDANCE RECORD', { underline: true });
            doc.moveDown(0.5);

            if (data.attendance && data.attendance.length > 0) {
                const attendanceTable = {
                    headers: [
                        { label: "S.No", property: 'sno', width: 40 },
                        { label: "Name of the participants", property: 'name', width: 250 },
                        { label: "Signature", property: 'signature', width: 130 }
                    ],
                    rows: data.attendance.map((a, i) => [String(i + 1), a.name || 'N/A', ''])
                };

                doc.table(attendanceTable, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(10).fillColor(SLATE);
                    }
                });
            } else {
                doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text('No attendance data provided.');
            }
            doc.moveDown(2);

            // --- Photo Proofs ---
            if (data.photo1 || data.photo2) {
                doc.addPage();
                drawHeader();
                doc.font('Helvetica-Bold').fontSize(12).fillColor(PURPLE).text('GEO-PHOTO PROOFS', { align: 'center' });
                doc.moveDown(1);

                const photos = [
                    { data: data.photo1, caption: data.photo1Caption },
                    { data: data.photo2, caption: data.photo2Caption }
                ].filter(p => p.data);

                photos.forEach((photo, idx) => {
                    if (doc.y > 500) doc.addPage();
                    try {
                        doc.image(photo.data, { fit: [500, 300], align: 'center' });
                        if (photo.caption) {
                            doc.moveDown(0.5);
                            doc.font('Helvetica-Oblique').fontSize(9).fillColor(SLATE).text(photo.caption, { align: 'center' });
                        }
                        doc.moveDown(2);
                    } catch (e) {
                         doc.text(`[Invalid Photo ${idx + 1} Format]`, { color: 'red' });
                    }
                });
            }

            // --- Feedback Section ---
            doc.addPage();
            drawHeader();
            doc.font('Helvetica-Bold').fontSize(12).fillColor(PURPLE).text('FEEDBACK / SATISFACTION SURVEY', { underline: true });
            doc.moveDown(0.5);

            if (data.feedback && data.feedback.length > 0) {
                const feedbackTable = {
                    headers: [
                        { label: "S.No", property: 'sno', width: 40 },
                        { label: "Name of the participants", property: 'name', width: 200 },
                        { label: "Feedback", property: 'feedback', width: 180 }
                    ],
                    rows: data.feedback.map((f, i) => [String(i + 1), f.name || 'N/A', f.comment || 'N/A'])
                };

                doc.table(feedbackTable, {
                    prepareHeader: () => doc.font("Helvetica-Bold").fontSize(10).fillColor(NAVY),
                    prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
                        doc.font("Helvetica").fontSize(10).fillColor(SLATE);
                    }
                });
            } else {
                doc.font('Helvetica-Oblique').fontSize(9).fillColor('#94a3b8').text('No feedback data provided.');
            }
            doc.moveDown(2);

            // --- Resource Person Detail ---
            doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY).text('Resource Person detail with their expertise:');
            doc.font('Helvetica-Oblique').fontSize(10).fillColor(SLATE).text(data.resourcePerson || 'N/A', { align: 'justify' });
            doc.moveDown(1.5);

            // --- Summary of the Event ---
            doc.addPage();
            drawHeader();
            doc.font('Helvetica-Bold').fontSize(12).fillColor(PURPLE).text('SUMMARY OF THE EVENT', { align: 'center' });
            doc.moveDown(1);

            const summarySections = [
                { label: 'Event overview (Purpose, Guest of honour)', value: data.summaryOverview },
                { label: 'Strategies used', value: data.summaryStrategies },
                { label: 'Activities done', value: data.summaryActivities },
                { label: 'Accomplishments', value: data.summaryAccomplishments },
                { label: 'Achievements', value: data.summaryAchievements },
                { label: 'Takeaways', value: data.summaryTakeaways }
            ];

            summarySections.forEach(section => {
                doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY).text(section.label + ':');
                doc.font('Helvetica').fontSize(10).fillColor(SLATE).text(section.value || 'N/A', { align: 'justify' });
                doc.moveDown(0.8);
            });

            // --- Signature Block ---
            doc.moveDown(3);
            const sigY = doc.y;
            doc.font('Helvetica-Bold').fontSize(10).fillColor(NAVY);
            doc.text('Signature of the Co-ordinator', 50, sigY);
            doc.text('Club In charge', doc.page.width - 150, sigY, { align: 'right' });

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = {
    generateClubEventReportBuffer
};
