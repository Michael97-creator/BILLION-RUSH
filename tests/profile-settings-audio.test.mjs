import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const main = readFileSync(new URL('../billion-rush/src/main.js', import.meta.url), 'utf8')
const audio = readFileSync(new URL('../billion-rush/src/audio.js', import.meta.url), 'utf8')
const css = readFileSync(new URL('../billion-rush/src/style.css', import.meta.url), 'utf8')

test('first-run profile asks only for display name and country', () => {
  assert.match(main, /id="profileDisplayName"[^>]*required/)
  assert.match(main, /id="profileCountry"[^>]*required/)
  assert.match(main, /function profileSetup\(\)/)
  assert.match(main, /No email or password required/)
})

test('profile and preferences persist locally under the shared audio settings key', () => {
  assert.match(main, /const PLAYER_PROFILE_KEY = 'billionRush\.profile\.v4'/)
  assert.match(main, /localStorage\.setItem\(PLAYER_PROFILE_KEY, JSON\.stringify\(playerProfile\)\)/)
  assert.match(main, /settings:\s*\{sound:true,music:true,vibration:true\}/)
  assert.match(audio, /billionRush\.profile\.v4/)
})

test('settings include sound, music, vibration, privacy, and safe statistics reset', () => {
  assert.match(main, /toggle\('soundSetting','Sound effects','sound'\)/)
  assert.match(main, /toggle\('musicSetting','Background music','music'\)/)
  assert.match(main, /toggle\('vibrationSetting','Vibration','vibration'\)/)
  assert.match(main, /id=\"privacyBtn\"/)
  assert.match(main, /id=\"resetStatsBtn\"/)
  assert.match(main, /Purchased inventory and payment records will not be deleted/)
})

test('audio preferences can stop and restart background music', () => {
  assert.match(audio, /export function applySettings\(mode='home'\)/)
  assert.match(audio, /if\(!settings\(\)\.music\)\{stopMusic\(\);return\}/)
  assert.match(audio, /export function click\(\)/)
  assert.match(main, /audio\.correct\(\)/)
  assert.match(main, /audio\.wrong\(\)/)
  assert.match(main, /audio\.gameOver\(\)/)
})

test('profile settings use premium responsive styles', () => {
  assert.match(css, /\.profile-setup-screen/)
  assert.match(css, /\.settings-form/)
  assert.match(css, /@media\(max-width:620px\)/)
})
