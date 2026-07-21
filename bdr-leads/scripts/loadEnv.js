/** Load .env.production.local / .env.local into process.env before setup. */
const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  let i = 0
  while (i < raw.length) {
    if (raw[i] === '#' || raw[i] === '\n') {
      const nl = raw.indexOf('\n', i)
      i = nl === -1 ? raw.length : nl + 1
      continue
    }
    const eq = raw.indexOf('=', i)
    if (eq === -1) break
    const key = raw.slice(i, eq).trim()
    let j = eq + 1
    let val = ''
    if (raw[j] === '"' || raw[j] === "'") {
      const quote = raw[j]
      j++
      let out = ''
      while (j < raw.length) {
        if (raw[j] === '\\' && j + 1 < raw.length) {
          out += raw[j + 1]
          j += 2
          continue
        }
        if (raw[j] === quote) { j++; break }
        out += raw[j]
        j++
      }
      val = out
      while (j < raw.length && raw[j] !== '\n') j++
      i = j + 1
    } else {
      const nl = raw.indexOf('\n', j)
      val = (nl === -1 ? raw.slice(j) : raw.slice(j, nl)).trim()
      i = nl === -1 ? raw.length : nl + 1
    }
    if (key && process.env[key] === undefined) process.env[key] = val
  }
}

const root = path.join(__dirname, '..')
loadEnvFile(path.join(root, '.env.production.local'))
loadEnvFile(path.join(root, '.env.local'))
