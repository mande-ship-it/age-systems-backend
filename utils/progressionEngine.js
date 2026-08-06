const AcademicResult = require('../models/AcademicResult');
const Scholar = require('../models/Scholar');
const NotificationService = require('./notificationService');

/**
 * Logic to determine if a scholar passes their current academic year
 * and handles promotion/graduation/failing flags.
 */
const evaluateProgression = async (scholarId, year) => {
    const scholar = await Scholar.findById(scholarId);
    if (!scholar) return;

    const results = await AcademicResult.find({ scholarId, year });
    if (results.length === 0) return;

    const isSecondary = scholar.schoolType === 'Secondary';
    const isUniversity = scholar.schoolType === 'University';

    // 1. Check if the year is "complete" (Spec Section 3)
    const termsRecorded = [...new Set(results.map(r => r.term).filter(Boolean))];
    const semestersRecorded = [...new Set(results.map(r => r.semester).filter(Boolean))];

    const isComplete = (isSecondary && termsRecorded.length === 3) ||
                       (isUniversity && semestersRecorded.length === 2);

    if (!isComplete) {
        console.log(`[Progression] Scholar ${scholar.fullName} (${year}) - Results incomplete (${isSecondary ? termsRecorded.length + '/3 terms' : semestersRecorded.length + '/2 semesters'}).`);
        return;
    }

    // 2. Calculate average scores (Spec Section 4 & 5)
    let finalYearlyAverage = 0;

    if (isSecondary) {
        // Average of 3 term scores. Each term score = average of best 6 subjects.
        const termAverages = [];
        for (const t of ['Term 1', 'Term 2', 'Term 3']) {
            const termResults = results.filter(r => r.term === t)
                                       .sort((a, b) => b.marks - a.marks)
                                       .slice(0, 6);
            if (termResults.length > 0) {
                const termAvg = termResults.reduce((sum, r) => sum + r.marks, 0) / termResults.length;
                termAverages.push(termAvg);
            }
        }
        if (termAverages.length === 3) {
            finalYearlyAverage = termAverages.reduce((sum, a) => sum + a, 0) / 3;
        }
    } else {
        // University: Average of 2 semesters.
        const semAverages = [];
        for (const s of ['Semester 1', 'Semester 2']) {
            const semResults = results.filter(r => r.semester === s);
            if (semResults.length > 0) {
                const semAvg = semResults.reduce((sum, r) => sum + r.marks, 0) / semResults.length;
                semAverages.push(semAvg);
            }
        }
        if (semAverages.length === 2) {
            finalYearlyAverage = semAverages.reduce((sum, a) => sum + a, 0) / 2;
        }
    }

    // 3. Determine if currentYearPassed
    const passThreshold = isSecondary ? 40 : 50;
    const currentYearPassed = finalYearlyAverage >= passThreshold;

    console.log(`[Progression] Scholar ${scholar.fullName} yearly average: ${finalYearlyAverage.toFixed(1)}%. Passed: ${currentYearPassed}`);

    // 4. Branching Logic (Spec Section 3)
    let newStatus = scholar.status;
    let newAcademicYear = scholar.academicYear;
    let newYearsCompleted = scholar.yearsCompleted;
    let newFlag = null;
    let historyStatus = '';

    if (scholar.yearsCompleted + 1 >= scholar.programDurationYears && currentYearPassed) {
        // GRADUATION
        newStatus = 'Graduated';
        historyStatus = 'Graduated';
        // Note: status 'Awaiting Allocation' mentioned in spec,
        // but existing 'Graduated' status is similar. I'll use 'Graduated'.
        // If we want exactly as spec:
        newStatus = 'Awaiting Allocation';
    }
    else if (currentYearPassed) {
        // PROMOTION
        newYearsCompleted += 1;
        newFlag = null; // Clear any old flags

        // Advance literal label
        if (isSecondary) {
            const currentNum = parseInt(newAcademicYear.replace('Form ', ''));
            if (!isNaN(currentNum)) newAcademicYear = `Form ${currentNum + 1}`;
        } else {
            const currentNum = parseInt(newAcademicYear.replace('Year ', ''));
            if (!isNaN(currentNum)) newAcademicYear = `Year ${currentNum + 1}`;
        }
        historyStatus = 'Promoted';
    }
    else {
        // FAILURE (Spec Section 7)
        // Default Logic for Decision:
        // Supplementary: If average is close to pass mark (e.g. >= pass - 5) AND no more than 2 subjects failed.
        // Otherwise: Repeat.

        const threshold = isSecondary ? 40 : 50;
        const subjectsFailed = results.filter(r => r.marks < threshold).length;
        const isCloseToPass = finalYearlyAverage >= (threshold - 5);

        if (subjectsFailed <= 2 && isCloseToPass) {
            newFlag = 'SUPPLEMENTARY';
            historyStatus = 'Failed - Supplementary';
        } else {
            newFlag = 'REPEAT';
            historyStatus = 'Failed - Repeat';
        }
        // yearsCompleted does NOT increment
    }

    // 5. Update Database
    scholar.status = newStatus;
    scholar.academicYear = newAcademicYear;
    scholar.yearsCompleted = newYearsCompleted;
    scholar.flag = newFlag;

    scholar.progressionHistory.push({
        year,
        average: finalYearlyAverage.toFixed(1),
        result: historyStatus,
        from_class: scholar.academicYear, // The class they were in
        to_class: newAcademicYear,
        date: new Date()
    });

    await scholar.save();

    await NotificationService.notifyAll(
        `🎓 Progression: ${scholar.fullName} status updated to ${newStatus}. Yearly Average: ${finalYearlyAverage.toFixed(1)}%`,
        currentYearPassed ? 'success' : 'warning'
    );

    return { passed: currentYearPassed, average: finalYearlyAverage, status: historyStatus };
};

module.exports = { evaluateProgression };
