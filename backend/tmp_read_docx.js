const JSZip = require('jszip');
const fs = require('fs');
const path = require('path');

const docxPath = 'c:\\Users\\rahul\\OneDrive\\Desktop\\ccc\\backend\\Club Event Report Framework.docx';

async function extractText() {
    try {
        const data = fs.readFileSync(docxPath);
        const zip = await JSZip.loadAsync(data);
        const docFile = zip.file('word/document.xml');
        if (!docFile) {
            console.log('Not a valid docx file');
            return;
        }
        const content = await docFile.async('string');
        // Simple regex to extract text between <w:t> tags
        const texts = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
        if (texts) {
            const cleanText = texts.map(t => t.replace(/<[^>]+>/g, '')).join(' ');
            console.log(cleanText);
        } else {
            console.log('No text found');
        }
    } catch (err) {
        console.error(err);
    }
}

extractText();
