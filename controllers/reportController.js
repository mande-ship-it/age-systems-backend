const Scholar = require('../models/Scholar');
const Report = require('../models/Report');
const AuditLog = require('../models/AuditLog');
const School = require('../models/School');
const AcademicResult = require('../models/AcademicResult');
const { generatePDF } = require('../utils/pdfGenerator');
const { generateExcel } = require('../utils/excelGenerator');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 1. Data Retrieval for UI Components
 */
const getAttendanceReport = async (req, res, next) => {
    try {
        const { month } = req.query;
        const data = await Report.getAttendanceReportData(month);
        return successResponse(res, data, 'Attendance report data retrieved.');
    } catch (err) {
        next(err);
    }
};

const getScholarReport = async (req, res, next) => {
    try {
        const { period, type } = req.query;
        const data = await Report.getScholarReportData(period, type);
        return successResponse(res, data, 'Scholar report data retrieved.');
    } catch (err) {
        next(err);
    }
};

const getSchoolReport = async (req, res, next) => {
    try {
        const { level } = req.query;
        const data = await Report.getSchoolReportData(level);
        return successResponse(res, data, 'School report data retrieved.');
    } catch (err) {
        next(err);
    }
};

const getSponsorReport = async (req, res, next) => {
    try {
        const { region } = req.query;
        const data = await Report.getSponsorReportData(region);
        return successResponse(res, data, 'Sponsor report data retrieved.');
    } catch (err) {
        next(err);
    }
};

/**
 * 2. Excel Export Logic (matches ExportExcelComponent)
 */
const exportToExcel = async (req, res, next) => {
    try {
        const { datasets, options } = req.body; // datasets: ['Scholar Master List', ...]

        let workbookData = [];
        let sheetNames = [];

        if (datasets.includes('Scholar Master List')) {
            const scholars = await Scholar.getAll();
            const headers = ['ID', 'Name', 'Email', 'School', 'Academic Year', 'Status'];
            const data = scholars.map(s => [s.id, s.full_name, s.email, s.display_school_name, s.academic_year, s.status]);
            workbookData.push({ headers, data });
            sheetNames.push('Scholars');
        }

        if (datasets.includes('Institution Database')) {
            const schools = await School.getAll();
            const headers = ['ID', 'Name', 'Code', 'Level', 'Type', 'District', 'Email'];
            const data = schools.map(s => [s.id, s.name, s.code, s.level, s.type, s.district, s.email]);
            workbookData.push({ headers, data });
            sheetNames.push('Schools');
        }

        if (datasets.includes('User Access Logs')) {
            const logs = await AuditLog.getAll();
            const headers = ['ID', 'User', 'Action', 'Details', 'Timestamp'];
            const data = logs.map(l => [l.id, l.user_name, l.action, l.details, l.created_at]);
            workbookData.push({ headers, data });
            sheetNames.push('Logs');
        }

        if (workbookData.length === 0) {
             return errorResponse(res, 'No valid datasets selected for export.', 400);
        }

        // generateExcel implementation takes (data, headers).
        const firstSheet = workbookData[0];
        const excelBuffer = await generateExcel(firstSheet.data, firstSheet.headers);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=system_export.xlsx');
        return res.send(excelBuffer);
    } catch (err) {
        next(err);
    }
};

/**
 * 3. PDF Export Logic (matches ExportPDFComponent)
 */
const exportToPDF = async (req, res, next) => {
    try {
        const { modules, settings } = req.body;

        let pdfContent = "SYSTEM REPORT\n\n";

        if (modules.includes('Scholar Profiles & Summaries')) {
            const scholars = await Scholar.getAll();
            pdfContent += "SCHOLAR SUMMARY\n";
            scholars.forEach(s => pdfContent += `${s.full_name} (${s.academic_year}) - ${s.status}\n`);
            pdfContent += "\n";
        }

        const pdfBuffer = await generatePDF('System Report', pdfContent);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=system_report.pdf');
        return res.send(pdfBuffer);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAttendanceReport,
    getScholarReport,
    getSchoolReport,
    getSponsorReport,
    exportToExcel,
    exportToPDF
};
