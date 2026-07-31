const PDFDocument = require('pdfkit');

/**
 * Generate a real PDF document buffer.
 * @param {string} title - Title of document
 * @param {string} content - Body content
 * @returns {Promise<Buffer>} PDF file buffer
 */
const generatePDF = (title, content) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // Header
        doc.fillColor('#4C3C32').fontSize(20).text('AGE AFRICA', { align: 'center' });
        doc.fontSize(10).text('Scholar Management System', { align: 'center' });
        doc.moveDown();

        doc.fillColor('#9AB334').fontSize(16).text(title, { align: 'left' });
        doc.strokeColor('#EEEEEE').moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown();

        // Content
        doc.fillColor('#333333').fontSize(11).text(content, {
            align: 'justify',
            lineGap: 4
        });

        // Footer
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            doc.fontSize(8).fillColor('grey').text(
                `Generated on ${new Date().toLocaleString()} - Page ${i + 1}`,
                50,
                doc.page.height - 50,
                { align: 'center' }
            );
        }

        doc.end();
    });
};

module.exports = {
    generatePDF
};
