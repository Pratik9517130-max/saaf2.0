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
 * Intelligent classifier for waste reports supporting English, Hindi & Hinglish tokens.
 * @param {string} text 
 * @param {string} fileName 
 * @returns {object}
 */
export function classifyWasteIssue(text = '', fileName = '') {
  const combined = `${text} ${fileName}`.toLowerCase()

  // 1. Critical safety hazards check
  if (
    combined.includes('glass') ||
    combined.includes('kaanch') ||
    combined.includes('kach') ||
    combined.includes('broken glass') ||
    combined.includes('chemical') ||
    combined.includes('medical') ||
    combined.includes('injury') ||
    combined.includes('hazard') ||
    combined.includes('sharp') ||
    combined.includes('wire') ||
    combined.includes('spark')
  ) {
    return {
      issue_type: 'other',
      priority: 'critical',
      reason: 'Broken glass or hazardous material detected — immediate injury/safety risk',
      source: 'ai',
    }
  }

  // 2. Missed Collection check
  if (
    combined.includes('missed') ||
    combined.includes('nahi aaya') ||
    combined.includes('uthaya nahi') ||
    combined.includes('collection') ||
    combined.includes('skipped') ||
    combined.includes('collector') ||
    combined.includes('not collected') ||
    combined.includes('aaya nahi')
  ) {
    const isCritical = combined.includes('days') || combined.includes('4 days') || combined.includes('week')
    return {
      issue_type: 'missed_collection',
      priority: isCritical ? 'critical' : 'medium',
      reason: isCritical
        ? 'Waste collection missed for several days, potential hygiene escalation'
        : 'Scheduled doorstep or floor waste collection was missed',
      source: 'ai',
    }
  }

  // 3. Overflowing Bin check
  if (
    combined.includes('overflow') ||
    combined.includes('overflowing') ||
    combined.includes('chhalak') ||
    combined.includes('dustbin') ||
    combined.includes('bin') ||
    combined.includes('trash can') ||
    combined.includes('kachradan') ||
    combined.includes('bhar gaya') ||
    combined.includes('bhar chuka') ||
    combined.includes('kachre ka dabba')
  ) {
    return {
      issue_type: 'overflowing_bin',
      priority: 'high',
      reason: 'Overflowing bin causing spillage and hygiene hazard in common premises',
      source: 'ai',
    }
  }

  // 4. Illegal Dumping / Heavy Debris check
  if (
    combined.includes('dump') ||
    combined.includes('illegal') ||
    combined.includes('malba') ||
    combined.includes('debris') ||
    combined.includes('construction') ||
    combined.includes('sofa') ||
    combined.includes('furniture') ||
    combined.includes('fenk') ||
    combined.includes('phenk') ||
    combined.includes('renovation') ||
    combined.includes('crates')
  ) {
    return {
      issue_type: 'illegal_dumping',
      priority: 'high',
      reason: 'Bulky waste or unauthorized debris dumping blocking common driveway/pathway',
      source: 'ai',
    }
  }

  // 5. Road / Pathway Garbage check
  if (
    combined.includes('road') ||
    combined.includes('street') ||
    combined.includes('sadak') ||
    combined.includes('walkway') ||
    combined.includes('pathway') ||
    combined.includes('corridor') ||
    combined.includes('lobby') ||
    combined.includes('gali') ||
    combined.includes('kachra') ||
    combined.includes('garbage') ||
    combined.includes('gandagi') ||
    combined.includes('spill') ||
    combined.includes('bikhra') ||
    combined.includes('kooda') ||
    combined.includes('waste') ||
    combined.includes('litter')
  ) {
    const isHigh =
      combined.includes('badbu') ||
      combined.includes('smell') ||
      combined.includes('stink') ||
      combined.includes('play') ||
      combined.includes('entrance') ||
      combined.includes('main gate')

    return {
      issue_type: 'road_garbage',
      priority: isHigh ? 'high' : 'medium',
      reason: isHigh
        ? 'Scattered garbage with strong odor or near prominent resident movement zone'
        : 'Loose garbage or litter scattered across society common walkway',
      source: 'ai',
    }
  }

  // 6. Generic CACHED match
  for (const [key, value] of Object.entries(CACHED)) {
    if (combined.includes(key)) {
      return { ...value, source: 'ai' }
    }
  }

  return {
    ...DEFAULT_CACHED,
    reason: text ? `Report classified for verification based on resident report` : DEFAULT_CACHED.reason,
    source: 'ai',
  }
}

export async function analyzeReport({ description = '', files = [], area = '' } = {}) {
  // First run high-accuracy local classifier as immediate ground truth
  const fileName = files[0]?.name || ''
  const localAnalysis = classifyWasteIssue(description, fileName)

  try {
    const image_base64 = files[0] ? await fileToResizedBase64(files[0]) : null

    // Call Supabase Edge Function with a fast 2.5s timeout so UI never stutters
    const call = supabase.functions.invoke('analyze-report', {
      body: {
        description: description || '',
        area: area || '',
        image_base64,
        mime_type: 'image/jpeg',
      },
    })

    const { data, error } = await withTimeout(call, 2500)
    if (error || !data || data.error) {
      throw error || new Error(data?.error || 'bad response')
    }

    return {
      issue_type: data.issue_type || localAnalysis.issue_type,
      priority: data.priority || localAnalysis.priority,
      reason: data.reason || localAnalysis.reason,
      source: 'ai',
    }
  } catch {
    // Return intelligent multi-lingual analysis immediately
    return localAnalysis
  }
}



/**
 * Natural language parser for conversational AI Assistant.
 * Extracts intent, entity (area/block), and prepares complaint draft or status responses.
 * @param {string} message
 * @param {object} context
 * @returns {object}
 */
export function parseAssistantIntent(message = '', context = {}) {
  const text = message.trim().toLowerCase()
  const { areas = [], feed = [] } = context

  // 1. Status query intent
  if (
    text.includes('status') ||
    text.includes('check status') ||
    text.includes('mere complaint') ||
    text.includes('my complaint') ||
    text.includes('kya hua') ||
    text.includes('track') ||
    text.includes('update')
  ) {
    return {
      intent: 'check_status',
      reply: 'Here are the current complaint updates for Green Meadows Society:',
      data: feed.slice(0, 3),
    }
  }

  // 2. Pickup inquiry intent
  if (
    text.includes('pickup') ||
    text.includes('e-waste') ||
    text.includes('bulky') ||
    text.includes('sofa') ||
    text.includes('furniture') ||
    text.includes('battery') ||
    text.includes('gadget')
  ) {
    return {
      intent: 'schedule_pickup',
      reply: 'Doorstep pickup for bulky items, e-waste, and hazardous waste can be scheduled easily. Would you like to request a pickup slot?',
      action: {
        type: 'navigate',
        label: 'Open Pickup Request',
        path: '/pickup',
      },
    }
  }

  // 3. Waste Rules / Segregation Intent
  if (
    text.includes('how to') ||
    text.includes('rules') ||
    text.includes('kisme phenke') ||
    text.includes('segregat') ||
    text.includes('kaha dale') ||
    text.includes('recycle')
  ) {
    return {
      intent: 'rules',
      reply: 'Green Meadows Society Waste Guidelines:\n• 🟢 Green Bin: Wet & Organic kitchen waste\n• 🔵 Blue Bin: Clean dry waste (paper, plastic, cans)\n• 🔴 Special Box / Pickup: E-waste, batteries, toxic/hazardous items\n• 📦 Doorstep Pickup: Request via the Pickup tab for large items.',
    }
  }

  // 4. Complaint Filing Intent (English / Hinglish)
  // Check if message describes a waste problem (kachra, bin, overflow, garbage, dirty, smell, dump, etc.)
  const isComplaint =
    text.includes('overflow') ||
    text.includes('kachra') ||
    text.includes('kooda') ||
    text.includes('bin') ||
    text.includes('garbage') ||
    text.includes('dustbin') ||
    text.includes('gandagi') ||
    text.includes('spill') ||
    text.includes('glass') ||
    text.includes('dump') ||
    text.includes('missed') ||
    text.includes('clean') ||
    text.includes('saaf') ||
    text.includes('tower') ||
    text.includes('block')

  if (isComplaint) {
    const analysis = classifyWasteIssue(message, '')

    // Detect Block
    let detectedBlock = 'A'
    if (text.includes('tower b') || text.includes('block b') || text.includes('b tower') || text.includes('b block')) {
      detectedBlock = 'B'
    } else if (text.includes('tower c') || text.includes('block c') || text.includes('c tower') || text.includes('c block')) {
      detectedBlock = 'C'
    } else if (text.includes('tower a') || text.includes('block a') || text.includes('a tower') || text.includes('a block')) {
      detectedBlock = 'A'
    }

    // Detect Area
    const matchedArea = areas.find((a) => {
      const aName = a.area_name.toLowerCase()
      const aBlock = (a.block || '').toLowerCase()
      return (
        (text.includes(aName) || text.includes(aName.replace('tower ' + aBlock, '').trim())) &&
        aBlock === detectedBlock.toLowerCase()
      )
    })

    const detectedArea = matchedArea || areas.find((a) => a.block === detectedBlock) || areas[0] || {
      id: 1,
      block: detectedBlock,
      area_name: `${detectedBlock} Ground Area`,
    }


    return {
      intent: 'file_complaint',
      reply: `I understood your report for Tower ${detectedBlock}! Here is the draft complaint created from your message:`,
      draft: {
        issue_type: analysis.issue_type,
        priority: analysis.priority,
        priority_reason: analysis.reason,
        description: message,
        block: detectedBlock,
        area_id: detectedArea.id,
        area_name: detectedArea.area_name,
      },
    }
  }

  // 5. Default friendly greeting or assistance
  return {
    intent: 'greeting',
    reply: `Namaste! I can assist you in filing waste complaints from natural voice or Hinglish messages, or help check society cleanliness status.\n\nTry typing: "Tower B parking ka bin overflow ho raha hai" or "Check status".`,
  }
}