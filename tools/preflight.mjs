import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const checks = []
const add = (label, ok, detail, severity = 'error') => checks.push({ label, ok, detail, severity })
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))

let rootPkg, appPkg, cap
try { rootPkg = readJson('package.json'); add('Root package.json', true, 'Valid JSON') }
catch (e) { add('Root package.json', false, e.message); rootPkg = {} }
try { appPkg = readJson('billion-rush/package.json'); add('Web app package.json', true, 'Valid JSON') }
catch (e) { add('Web app package.json', false, e.message); appPkg = {} }
try { cap = readJson('capacitor.config.json'); add('Capacitor config', true, 'Valid JSON; appId=' + cap.appId + ', webDir=' + cap.webDir) }
catch (e) { add('Capacitor config', false, e.message); cap = {} }

const nodeMajor = Number(process.versions.node.split('.')[0])
add('Node.js version', nodeMajor >= 22, `Detected ${process.versions.node}; Capacitor 8 project should use Node.js 22 or newer`, 'error')
add('Vite dependency declared', Boolean(appPkg.devDependencies?.vite), appPkg.devDependencies?.vite ? `Declared as ${appPkg.devDependencies.vite}` : 'Missing from billion-rush/package.json')
add('Capacitor CLI declared', Boolean(rootPkg.devDependencies?.['@capacitor/cli']), rootPkg.devDependencies?.['@capacitor/cli'] ? `Declared as ${rootPkg.devDependencies['@capacitor/cli']}` : 'Missing from root package.json')
add('Web build directory matches Capacitor', cap.webDir === 'billion-rush/dist', `Configured webDir: ${cap.webDir || '(missing)'}`)
add('Capacitor TypeScript config removed', !fs.existsSync(path.join(root, 'capacitor.config.ts')), fs.existsSync(path.join(root, 'capacitor.config.ts')) ? 'Unexpected capacitor.config.ts may conflict with JSON config' : 'Only capacitor.config.json is present')
add('Vite output exists', fs.existsSync(path.join(root, 'billion-rush/dist/index.html')), fs.existsSync(path.join(root, 'billion-rush/dist/index.html')) ? 'Built index.html found' : 'Not built yet; run npm run build after npm install', 'warning')
add('Android platform exists', fs.existsSync(path.join(root, 'android')), fs.existsSync(path.join(root, 'android')) ? 'Android project folder found' : 'Not generated yet; run npm run android:add after a successful web build', 'warning')
add('Root dependencies installed', fs.existsSync(path.join(root, 'node_modules/@capacitor/cli/package.json')), fs.existsSync(path.join(root, 'node_modules/@capacitor/cli/package.json')) ? 'Capacitor CLI found in node_modules' : 'Dependencies not installed or Capacitor CLI missing; run npm install', 'warning')
add('Vite installed', fs.existsSync(path.join(root, 'node_modules/vite/package.json')) || fs.existsSync(path.join(root, 'node_modules/billion-rush/node_modules/vite/package.json')), fs.existsSync(path.join(root, 'node_modules/vite/package.json')) || fs.existsSync(path.join(root, 'node_modules/billion-rush/node_modules/vite/package.json')) ? 'Vite package found' : 'Vite not installed; run npm install', 'warning')

const envPath = path.join(root, 'billion-rush/.env.local')
const envExample = path.join(root, 'billion-rush/.env.example')
let hasUrl = false, hasKey = false
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, 'utf8')
  hasUrl = /^\s*VITE_SUPABASE_URL\s*=\s*https?:\/\//m.test(env)
  hasKey = /^\s*VITE_SUPABASE_ANON_KEY\s*=\s*\S+/m.test(env)
}
add('Supabase frontend environment', hasUrl && hasKey, hasUrl && hasKey ? 'URL and anon key appear configured (values hidden)' : `Not fully configured in billion-rush/.env.local${fs.existsSync(envExample) ? '; copy .env.example to .env.local and fill in the public URL/anon key' : ''}`, 'warning')

console.log('\nBILLION RUSH — LOCAL BUILD PREFLIGHT\n')
for (const c of checks) {
  const status = c.ok ? 'PASS' : c.severity === 'warning' ? 'CHECK' : 'FAIL'
  console.log(`[${status}] ${c.label}: ${c.detail}`)
}
const failures = checks.filter(c => !c.ok && c.severity === 'error')
const warnings = checks.filter(c => !c.ok && c.severity === 'warning')
console.log(`\nSummary: ${checks.length - failures.length - warnings.length} passed, ${warnings.length} checks pending, ${failures.length} blocking checks.`)
if (failures.length) process.exitCode = 1
