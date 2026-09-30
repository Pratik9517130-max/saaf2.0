export async function analyzeReport() {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return {
    issue_type: 'overflowing_bin',
    priority: 'high',
    reason: 'Overflowing bin near a play area',
    source: 'cache',
  }
}