/**
 * Test script to run bias detection on test-case-5.csv
 * This bypasses the UI and runs the backend logic directly
 */

const fs = require('fs');
const path = require('path');

// Simulate the bias detection pipeline
async function testBiasDetection() {
    console.log('='.repeat(60));
    console.log('TESTING BIAS DETECTION ON test-case-5.csv');
    console.log('='.repeat(60));

    // Read the CSV file
    const csvPath = path.join(__dirname, '..', 'test-data', 'test-case-5.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('\n[TEST] CSV file loaded');
    console.log('[TEST] File size:', csvContent.length, 'bytes');

    const lines = csvContent.trim().split('\n');
    console.log('[TEST] Total lines:', lines.length);
    console.log('[TEST] Data rows:', lines.length - 1);

    const headers = lines[0].split(',');
    console.log('\n[TEST] Headers:', headers);

    // Suggest roles for this dataset
    const suggestedRoles = {
        'ApplicantID': 'ignored',
        'Gender': 'sensitive',
        'Age': 'merit',
        'CreditScore': 'merit',
        'AnnualIncome': 'merit',
        'LoanAmount': 'merit',
        'YearsInJob': 'merit',
        'Education': 'merit',
        'ZipCode': 'ignored',
        'LoanApproved': 'outcome'
    };

    console.log('\n[TEST] Suggested roles:');
    Object.entries(suggestedRoles).forEach(([col, role]) => {
        console.log(`  ${col}: ${role}`);
    });

    console.log('\n[TEST] ⚠️  KEY INSIGHT:');
    console.log('[TEST] This dataset has 7 merit columns (Age, CreditScore, Income, etc.)');
    console.log('[TEST] For comparable groups, ALL 7 merit values must match EXACTLY');
    console.log('[TEST] With 200 rows and high-dimensional merit space, this is very unlikely!');

    console.log('\n[TEST] 📊 Sample data preview:');
    for (let i = 1; i <= 5; i++) {
        console.log(`  Row ${i}:`, lines[i]);
    }

    console.log('\n[TEST] 🔍 Checking for exact merit matches...');

    // Parse data
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx];
        });
        rows.push(row);
    }

    // Find rows with identical merit values
    const meritColumns = ['Age', 'CreditScore', 'AnnualIncome', 'LoanAmount', 'YearsInJob', 'Education'];

    const groups = new Map();

    rows.forEach((row, idx) => {
        const meritKey = meritColumns.map(col => row[col]).join('|');
        if (!groups.has(meritKey)) {
            groups.set(meritKey, []);
        }
        groups.get(meritKey).push({ ...row, _index: idx + 1 });
    });

    console.log(`\n[TEST] Total unique merit combinations: ${groups.size}`);
    console.log(`[TEST] Total rows: ${rows.length}`);

    // Find groups with multiple rows (potential comparable groups)
    const comparableGroups = Array.from(groups.entries())
        .filter(([_, rows]) => rows.length > 1);

    console.log(`\n[TEST] ✅ Groups with 2+ rows (comparable): ${comparableGroups.length}`);

    if (comparableGroups.length === 0) {
        console.log('\n[TEST] ❌ PROBLEM IDENTIFIED:');
        console.log('[TEST] No comparable groups found!');
        console.log('[TEST] Reason: Too many merit columns with unique value combinations');
        console.log('[TEST] Solution: Reduce merit columns or relax matching criteria');
    } else {
        console.log('\n[TEST] Sample comparable groups:');
        comparableGroups.slice(0, 3).forEach(([key, groupRows], idx) => {
            console.log(`\n  Group ${idx + 1} (${groupRows.length} rows):`);
            console.log(`    Merit values: ${key}`);
            groupRows.forEach(r => {
                console.log(`      Row ${r._index}: Gender=${r.Gender}, Approved=${r.LoanApproved}`);
            });
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST COMPLETE');
    console.log('='.repeat(60));
}

testBiasDetection().catch(console.error);
