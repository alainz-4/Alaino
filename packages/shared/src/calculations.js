export const DEFAULT_BUDGET_SPLIT = {
    needsPercent: 50,
    wantsPercent: 30,
    savingsPercent: 20
};
export function roundMoney(value) {
    return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}
export function calculateEmergencyFundTarget(essentialExpenses, desiredMonths = 6) {
    return roundMoney(Math.max(0, essentialExpenses) * Math.max(0, desiredMonths));
}
export function calculateRunwayMonths(currentReserves, essentialExpenses) {
    if (essentialExpenses <= 0) {
        return 0;
    }
    return roundMoney(Math.max(0, currentReserves) / essentialExpenses);
}
export function normalizeBudgetSplit(split) {
    const needs = Math.max(0, split.needsPercent);
    const wants = Math.max(0, split.wantsPercent);
    const savings = Math.max(0, split.savingsPercent);
    const total = needs + wants + savings || 100;
    return {
        needsPercent: roundMoney((needs / total) * 100),
        wantsPercent: roundMoney((wants / total) * 100),
        savingsPercent: roundMoney((savings / total) * 100)
    };
}
export function calculateBudgetRecommendation(monthlyIncome, split = DEFAULT_BUDGET_SPLIT) {
    const normalized = normalizeBudgetSplit(split);
    return {
        needs: roundMoney(monthlyIncome * (normalized.needsPercent / 100)),
        wants: roundMoney(monthlyIncome * (normalized.wantsPercent / 100)),
        savings: roundMoney(monthlyIncome * (normalized.savingsPercent / 100))
    };
}
export function calculateRequiredMonthlyIncome(params) {
    return roundMoney(Math.max(0, params.essentialExpenses) +
        Math.max(0, params.lifestyleSpending) +
        Math.max(0, params.savingsGoalMonthly));
}
export function calculateMinDailyRate(requiredMonthlyIncome, workingDays) {
    if (workingDays <= 0) {
        return 0;
    }
    return roundMoney(requiredMonthlyIncome / workingDays);
}
export function calculateRequiredWorkingDays(requiredMonthlyIncome, dailyRate) {
    if (dailyRate <= 0) {
        return 0;
    }
    return Math.ceil(requiredMonthlyIncome / dailyRate);
}
export function calculateInvoiceLineTotals(lines) {
    return roundMoney(lines.reduce((sum, line) => sum + Math.max(0, line.quantityDays) * Math.max(0, line.unitPrice), 0));
}
export function calculateInvoiceTotals(params) {
    const subtotal = calculateInvoiceLineTotals(params.lines);
    const vatAmount = params.vatApplicable ? roundMoney(subtotal * (Math.max(0, params.vatRate) / 100)) : 0;
    return {
        subtotal,
        vatAmount,
        total: roundMoney(subtotal + vatAmount)
    };
}
export function buildInvoiceLineDrafts(lines) {
    return lines.map((line) => ({
        description: line.description,
        quantityDays: Math.max(0, line.quantityDays),
        unitPrice: Math.max(0, line.unitPrice),
        total: roundMoney(Math.max(0, line.quantityDays) * Math.max(0, line.unitPrice))
    }));
}
export function buildAssistantRecommendations(params) {
    const recommendations = [];
    const targetMonths = params.targetMonths ?? 6;
    const runwayMessage = params.runwayMonths >= targetMonths
        ? `Your reserves cover about ${params.runwayMonths.toFixed(1)} months, so you are above the ${targetMonths}-month safety target.`
        : `Your reserves cover about ${params.runwayMonths.toFixed(1)} months, so you are below the ${targetMonths}-month safety target.`;
    recommendations.push({
        title: "Emergency fund",
        message: runwayMessage
    });
    const extraIncome = params.projectedIncome - params.requiredMonthlyIncome;
    if (extraIncome > 0 && params.averageDailyRate > 0) {
        const extraDaysOff = Math.floor(extraIncome / params.averageDailyRate);
        recommendations.push({
            title: "Time off",
            message: `With your current reserves and projected income, you can safely take ${extraDaysOff} extra days off next month while still staying close to your target.`
        });
    }
    else {
        recommendations.push({
            title: "Time off",
            message: "Your projected income is tight relative to your target, so keep your planned working days unless you reduce spending."
        });
    }
    const reserveGap = params.emergencyFundTarget - params.currentReserves;
    if (reserveGap > 0) {
        recommendations.push({
            title: "Reserve gap",
            message: `You still need ${reserveGap.toFixed(2)} in reserves to reach your emergency-fund target.`
        });
    }
    else {
        recommendations.push({
            title: "Reserve gap",
            message: "Your current reserves are at or above the emergency-fund target."
        });
    }
    return recommendations;
}
