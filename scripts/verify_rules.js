
// Simulation of the Rules Logic

const originalRules = [
    "Match Duration: 8 Minutes",
    "No Extra Time",
    "Smart Assist: Turn Off"
];

// User updates: 
// 1. "Match Duration: 8 Minutes " (Accidental space at end)
// 2. "No Extra Time" (Unchanged)
// 3. "Smart Assist: Turn Off" (Unchanged)
// 4. "New Rule: Have Fun" (Actually New)

const newRules = [
    "Match Duration: 8 Minutes ", // Note the space
    "No Extra Time",
    "Smart Assist: Turn Off",
    "New Rule: Have Fun"
];

console.log("--- OLD LOGIC (Strict) ---");
newRules.forEach(r => {
    const isNew = !originalRules.includes(r);
    console.log(`"${r}" -> ${isNew ? '✅ [NEW]' : '❌ [OLD]'}`);
});

console.log("\n--- NEW LOGIC (Fixed) ---");
newRules.forEach(r => {
    const cleanRule = r.trim();
    // The fixed logic: checks if ANY existing rule matches the trimmed version
    const isNew = !originalRules.some(existing => existing.trim() === cleanRule);
    console.log(`"${r}" -> ${isNew ? '✅ [NEW]' : '❌ [OLD]'}`);
});
