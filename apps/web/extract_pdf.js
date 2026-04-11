import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

async function extractText() {
    const data = new Uint8Array(fs.readFileSync('C:/anything-dev/Proof_of_Reputation_Paper_IEEE (4).pdf'));
    const loadingTask = pdfjsLib.getDocument({data});
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const textItems = textContent.items.map(item => item.str);
        fullText += textItems.join(' ') + '\n';
    }
    fs.writeFileSync('C:/anything-dev/pdf_extracted.txt', fullText);
    console.log('Successfully extracted text to pdf_extracted.txt');
}

extractText().catch(err => {
    console.error('Error extracting text:', err);
    process.exit(1);
});
