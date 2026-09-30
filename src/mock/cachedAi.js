// src/mock/cachedAi.js  (owner: R4)
// Answers for the demo photos. Rename the demo photos so the file name contains the key.
export const CACHED = {
    bin: { issue_type: 'overflowing_bin', priority: 'high', reason: 'Overflowing bin near a play area' },
    dump: { issue_type: 'illegal_dumping', priority: 'high', reason: 'Bulky waste blocking the pathway' },
    road: { issue_type: 'road_garbage', priority: 'medium', reason: 'Loose garbage on a public road' },
    glass: { issue_type: 'other', priority: 'critical', reason: 'Broken glass, injury risk' },
};
export const DEFAULT_CACHED = {
    issue_type: 'other',
    priority: 'medium',
    reason: 'AI unavailable, please confirm the type',
};