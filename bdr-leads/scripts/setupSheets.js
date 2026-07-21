/**
 * One-time Google Sheets setup for bdr-leads.
 * Usage: node -r ./scripts/loadEnv.js scripts/setupSheets.js
 */
require('./loadEnv')
const { runSetup } = require('../lib/setupSheets')

runSetup().catch((e) => {
  console.error(e)
  process.exit(1)
})
