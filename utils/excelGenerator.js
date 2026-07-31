const ExcelJS = require('exceljs');

/**
 * Generate a real Excel report buffer.
 * @param {Array} data - Table data (Array of Arrays)
 * @param {Array} headers - Column headers
 * @returns {Promise<Buffer>} Excel file buffer
 */
const generateExcel = async (data, headers) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4C3C32' } // Brand Brown
    };

    // Add data
    data.forEach(row => {
        worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxColumnLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            const columnLength = cell.value ? cell.value.toString().length : 10;
            if (columnLength > maxColumnLength) {
                maxColumnLength = columnLength;
            }
        });
        column.width = maxColumnLength < 30 ? maxColumnLength + 2 : 30;
    });

    return await workbook.xlsx.writeBuffer();
};

module.exports = {
    generateExcel
};
