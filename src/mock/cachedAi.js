// src/mock/cachedAi.js  (owner: R4)
// Answers for demo photos and keyword fallbacks.
export const CACHED = {
    bin: { issue_type: 'overflowing_bin', priority: 'high', reason: 'Overflowing bin near a common area' },
    dump: { issue_type: 'illegal_dumping', priority: 'high', reason: 'Bulky waste or illegal dumping blocking pathway' },
    road: { issue_type: 'road_garbage', priority: 'medium', reason: 'Loose garbage on a road or walkway' },
    glass: { issue_type: 'other', priority: 'critical', reason: 'Broken glass, safety and injury risk' },
    garbage: { issue_type: 'road_garbage', priority: 'medium', reason: 'Accumulated garbage reported in common area' },
    waste: { issue_type: 'road_garbage', priority: 'medium', reason: 'Uncollected waste accumulation' },
    spill: { issue_type: 'road_garbage', priority: 'medium', reason: 'Waste spill requiring cleaning' },
    missed: { issue_type: 'missed_collection', priority: 'medium', reason: 'Scheduled waste collection was missed' },
    collection: { issue_type: 'missed_collection', priority: 'medium', reason: 'Scheduled waste collection was missed' },
};
export const DEFAULT_CACHED = {
    issue_type: 'other',
    priority: 'medium',
    reason: 'AI unavailable, please confirm the type',
};