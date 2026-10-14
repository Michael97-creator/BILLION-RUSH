import { verifyStorePurchase } from './backend.js'

const params = new URLSearchParams(location.search)
const reference = params.get('reference') || params.get('trxref') || ''
const playerId = params.get('playerId') || ''
const $ = id => document.getElementById(id)

try {
  if (!reference || !playerId) throw new Error('The payment reference is missing. Open Billion Rush and check your shop inventory before trying again.')
  const result = await verifyStorePurchase({ reference, playerId })
  if (result?.final) { try { localStorage.removeItem('billionRush.pendingPayment.v1') } catch {} }
  if (!result?.verified || !result.inventory) throw new Error('The payment has not been verified. No items were added. Return to Billion Rush and check your inventory again shortly.')
  // This cache is for the browser build only. The server inventory remains authoritative;
  // the Android app refreshes inventory from the server when it returns to the foreground.
  try { localStorage.setItem('billionRush.lifelineWallet.v1', JSON.stringify(result.inventory)); localStorage.removeItem('billionRush.pendingPayment.v1') } catch {}
  $('symbol').textContent = '✓'
  $('title').textContent = 'Payment verified'
  $('message').textContent = 'Your purchased items have been added to your Billion Rush inventory. Return to the game and get ready for your next Rush.'
} catch (error) {
  $('symbol').textContent = '!'
  $('title').textContent = 'Payment not confirmed yet'
  $('message').textContent = error?.message || 'We could not verify this payment. No items were added. Please return to Billion Rush and check again.'
}
