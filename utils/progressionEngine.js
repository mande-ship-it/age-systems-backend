const AcademicResult = require('../models/AcademicResult');
const Scholar = require('../models/Scholar');
const NotificationService = require('./notificationService');

/**
 * Logic to determine if a scholar passes their current academic year
 * and handles promotion/graduation/failing flags.
 */
const evaluateProgression = async (scholarId, year, targetClass = null) => {
    const scholar = await Scholar.findById(scholarId);
    if (!scholar) return;

    const evalClass = (targetClass || scholar.currentClass || "").toString().trim();
    if (!evalClass) return;

    const targetYear = parseInt(year);

    console.log(`[Progression] Evaluating ${scholar.fullName} | Class: ${evalClass} | Primary Year: ${targetYear}`);

    // 1. Fetch ALL results for this scholar and class to handle cross-year terms
    const allClassResults = await AcademicResult.find({
        scholarId,
        currentClass: evalClass
    }).sort({ year: -1 });

    if (allClassResults.length === 0) {
        console.log(`[Progression] No results found for ${evalClass}`);
        return;
    }

    const isSecondary = scholar.schoolType === 'Secondary';
    const isUniversity = scholar.schoolType === 'University';

    // 2. Resolve terms. If multiple years exist for a term, prefer targetYear, then latest year.
    const termMap = {};
    const allPeriods = isSecondary ? ['Term 1', 'Term 2', 'Term 3'] : ['Semester 1', 'Semester 2'];

    for (const p of allPeriods) {
        const periodResults = allClassResults.filter(ar =>
            isSecondary ? ar.term === p : ar.semester === p
        );

        if (periodResults.length > 0) {
            // Find the best year for this period
            let bestYear = periodResults[0].year;
            if (periodResults.some(r => r.year === targetYear)) {
                bestYear = targetYear;
            }

            termMap[p] = {
                year: bestYear,
                results: periodResults.filter(r => r.year === bestYear)
            };
        }
    }

    const termsRecordedCount = Object.keys(termMap).length;
    const isComplete = (isSecondary && termsRecordedCount >= 3) ||
                       (isUniversity && termsRecordedCount >= 2);

    if (!isComplete) {
        console.log(`[Progression] Incomplete: ${termsRecordedCount} periods found. Required: ${isSecondary ? '3' : '2'}`);
        return;
    }

    // 3. Calculate averages
    const periodAverages = [];
    for (const p of allPeriods) {
        const attempt = termMap[p];
        if (attempt && attempt.results.length > 0) {
            const sorted = [...attempt.results].sort((a, b) => b.marks - a.marks);
            // Secondary uses Best 6, Uni uses Best 5
            const relevant = sorted.slice(0, isSecondary ? 6 : 5);
            const avg = relevant.reduce((sum, r) => sum + r.marks, 0) / relevant.length;
            periodAverages.push(avg);
            console.log(`[Progression] ${p} (${attempt.year}) average: ${avg.toFixed(1)}% (Subjects: ${relevant.length})`);
        }
    }

    const finalYearlyAverage = periodAverages.reduce((sum, a) => sum + a, 0) / (periodAverages.length || 1);
    const passThreshold = 50;
    let currentYearPassed = finalYearlyAverage >= passThreshold;

    // --- University Strict Rule (New) ---
    // If university, also check if ANY course was failed (< 50) in the most recent attempts
    if (isUniversity && currentYearPassed) {
        let hasAnyFailures = false;
        for (const p of allPeriods) {
            const attempt = termMap[p];
            if (attempt && attempt.results.some(r => r.marks < passThreshold)) {
                hasAnyFailures = true;
                break;
            }
        }
        if (hasAnyFailures) {
            currentYearPassed = false;
            console.log(`[Progression] ${scholar.fullName} passed on average (${finalYearlyAverage.toFixed(1)}%) but has failed courses. Blocking promotion.`);
        }
    }

    console.log(`[Progression] Final Average for ${evalClass}: ${finalYearlyAverage.toFixed(1)}%. Result: ${currentYearPassed ? 'PASSED' : 'FAILED'}`);

    // 4. Update Logic
    let newStatus = scholar.status;
    let nextClassLabel = evalClass;
    let newYearsCompleted = scholar.yearsCompleted;
    let newFlag = null;
    let historyStatus = '';

    if (scholar.yearsCompleted + 1 >= scholar.programDurationYears && currentYearPassed) {
        newStatus = isSecondary ? 'Alumni' : 'Graduated';
        historyStatus = isSecondary ? 'Completed (Alumni Archive)' : 'Graduated (Awaiting Internship)';
        newYearsCompleted += 1;
        scholar.endYear = targetYear.toString();
    }
    else if (currentYearPassed) {
        newYearsCompleted += 1;
        newFlag = null;

        if (isSecondary) {
            const numMatch = evalClass.match(/\d+/);
            if (numMatch) {
                const nextNum = parseInt(numMatch[0]) + 1;
                nextClassLabel = `Form ${nextNum}`;
            }
        } else {
            const numMatch = evalClass.match(/\d+/);
            if (numMatch) {
                const nextNum = parseInt(numMatch[0]) + 1;
                nextClassLabel = `Year ${nextNum}`;
            }
        }
        historyStatus = 'Promoted';
    }
    else {
        // Fallback for failure flags
        const subjectsFailed = allClassResults.filter(r => r.marks < passThreshold).length;
        if (subjectsFailed <= 2 && finalYearlyAverage >= (passThreshold - 5)) {
            newFlag = 'SUPPLEMENTARY';
            historyStatus = 'Failed - Supplementary';
        } else {
            newFlag = 'REPEAT';
            historyStatus = 'Failed - Repeat';
        }
    }

    // 5. Commit Updates
    // Only move currentClass if this was an evaluation of their current level
    if (evalClass.toLowerCase() === (scholar.currentClass || "").toString().toLowerCase()) {
        scholar.status = newStatus;
        scholar.academicYear = nextClassLabel;
        scholar.currentClass = nextClassLabel;
        scholar.yearsCompleted = newYearsCompleted;
        scholar.flag = newFlag;
    }

    // Always record in history
    scholar.progressionHistory.push({
        year: targetYear,
        average: finalYearlyAverage.toFixed(1),
        result: historyStatus,
        from_class: evalClass,
        to_class: nextClassLabel,
        date: new Date()
    });

    await scholar.save();

    await NotificationService.notifyAll(
        `🎓 Progression: ${scholar.fullName} (${evalClass}) result: ${historyStatus}. Now in ${nextClassLabel}.`,
        currentYearPassed ? 'success' : 'warning'
    );

    return { passed: currentYearPassed, average: finalYearlyAverage, status: historyStatus };
};

module.exports = { evaluateProgression };
