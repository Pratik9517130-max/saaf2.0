// src/lib/ai.js  (owner: R4)  Contract: analyzeReport({ description, files, area })
// -> { issue_type, priority, reason, source: 'ai' | 'cache' }
import { supabase } from './supabase.js'
import { CACHED, DEFAULT_CACHED } from '../mock/cachedAi.js'

// Shrinks a phone photo to ~800px so the request is small and fast.
export function fileToResizedBase64(file, maxSide = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null)
      return
    }
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        // Ensure clean base64 string without data URI scheme prefix
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
        resolve(base64)
      } catch (err) {
        URL.revokeObjectURL(url)
        reject(err)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image load failed'))
    }
    img.src = url
  })
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

/**
 * Matches keyword against CACHED dictionary or specific keyword mappings.
 * @param {string} text
 * @returns {object|null}
 */
function findKeywordMatch(text = '') {
  if (!text) return null
  const clean = text.toLowerCase()

  // Match in order of priority / specificity
  if (clean.includes('glass')) return CACHED.glass
  if (clean.includes('dump')) return CACHED.dump
  if (clean.includes('bin') || clean.includes('dustbin')) return CACHED.bin
  if (clean.includes('missed') || clean.includes('collection')) return CACHED.missed
  if (clean.includes('spill')) return CACHED.spill
  if (clean.includes('garbage')) return CACHED.garbage
  if (clean.includes('road') || clean.includes('street') || clean.includes('walkway') || clean.includes('pathway')) return CACHED.road
  if (clean.includes('waste')) return CACHED.waste

  // Check any generic key in CACHED
  for (const [key, value] of Object.entries(CACHED)) {
    if (clean.includes(key)) {
      return value
    }
  }

  return null
}

export async function analyzeReport({ description = '', files = [], area = '' } = {}) {
  try {
    const image_base64 = files[0] ? await fileToResizedBase64(files[0]) : null
    const call = supabase.functions.invoke('analyze-report', {
      body: {
        description: description || '',
        area: area || '',
        image_base64,
        mime_type: 'image/jpeg',
      },
    })
    const { data, error } = await withTimeout(call, 8000)
    if (error || !data || data.error) {
      throw error || new Error(data?.error || 'bad response')
    }
    return { ...data, source: 'ai' }
  } catch (e) {
    console.warn('AI call failed, using cached answer:', e)
    const fileName = files[0]?.name || ''

    // 1. Try matching against uploaded file name
    let hit = findKeywordMatch(fileName)

    // 2. If file name matching fails, inspect description for keywords
    if (!hit && description) {
      hit = findKeywordMatch(description)
    }

    return { ...(hit || DEFAULT_CACHED), source: 'cache' }
  }
}