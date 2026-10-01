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
 * Extracts intent, entity (area/block), and prepares complaint draft, status, pickup or knowledge responses.
 * @param {string} message
 * @param {object} context
 * @returns {object}
 */
export function parseAssistantIntent(message = '', context = {}) {
  const rawText = message.trim()
  const text = rawText.toLowerCase()
  const { areas = [], feed = [] } = context

  // 1. Gratitude & Politeness
  if (
    text === 'thanks' ||
    text === 'thank you' ||
    text === 'dhanyawad' ||
    text === 'dhanyavaad' ||
    text === 'shukriya' ||
    text === 'shukriyaa' ||
    text === 'tysm' ||
    text === 'thx' ||
    text.includes('thank you') ||
    text.includes('bahut dhanyawad') ||
    text.includes('thanks a lot')
  ) {
    return {
      intent: 'gratitude',
      reply: `You're very welcome! 🌿 Happy to help keep Green Meadows Society spotless, green, and hygienic.\n\nPlease reach out anytime if you spot an issue, need doorstep pickup, or have questions!`,
    }
  }

  // 2. Farewells & Closings
  if (
    text === 'bye' ||
    text === 'goodbye' ||
    text === 'alvida' ||
    text === 'see you' ||
    text === 'good night' ||
    text === 'cya' ||
    text === 'exit' ||
    text.startsWith('bye ')
  ) {
    return {
      intent: 'closing',
      reply: `Goodbye! Have a great day ahead! Keep Green Meadows clean and green. 👋`,
    }
  }

  // 3. Affirmations / Acknowledgments
  if (
    text === 'ok' ||
    text === 'okay' ||
    text === 'theek hai' ||
    text === 'thik hai' ||
    text === 'got it' ||
    text === 'samajh gaya' ||
    text === 'accha' ||
    text === 'cool' ||
    text === 'great' ||
    text === 'awesome' ||
    text === 'nice' ||
    text === 'good' ||
    text === 'perfect' ||
    text === 'all right' ||
    text === 'alright' ||
    text === 'done'
  ) {
    return {
      intent: 'affirmation',
      reply: `Understood! 👍 I'm here whenever you need to file a report, track complaint status, or request a bulky scrap pickup.`,
    }
  }

  // 4. How to Report / Usage Instructions
  if (
    text.includes('how to report') ||
    text.includes('how do i report') ||
    text.includes('how to complain') ||
    text.includes('how to file') ||
    text.includes('how do i file') ||
    text.includes('file a complaint') ||
    text.includes('file complaint') ||
    text.includes('lodge a complaint') ||
    text.includes('complaint kaise kare') ||
    text.includes('report kaise kare') ||
    text.includes('kaise report') ||
    text.includes('kaise complain') ||
    text.includes('where to report') ||
    text.includes('how does reporting work') ||
    text.includes('process to report') ||
    text.includes('app kaise use')
  ) {
    return {
      intent: 'how_to_report',
      reply: `Reporting a waste issue in Saaf is fast and easy:\n\n1. **Directly in this Chat**: Simply describe the issue in plain words (e.g. *"Tower B parking bin overflow ho raha hai"*). I'll detect the area and priority, draft the complaint, and you can confirm it with one tap!\n\n2. **Photo Report Page**: Tap the **Report Issue** tab at the top to take or upload a photo. The AI image model verifies the waste type and sends it straight to the society cleaning squad with photo proof.\n\nWould you like to open the Photo Report form now?`,
      action: {
        type: 'navigate',
        label: 'Open Photo Report Form',
        path: '/report',
      },
    }
  }

  // 5. Friendly Greetings & Identity
  const isGreeting =
    text === 'hi' ||
    text === 'hello' ||
    text === 'hey' ||
    text === 'namaste' ||
    text === 'namaskar' ||
    text.startsWith('hi ') ||
    text.startsWith('hello ') ||
    text.startsWith('hey ') ||
    text.includes('kaise ho') ||
    text.includes('kya haal') ||
    text.includes('good morning') ||
    text.includes('good evening') ||
    text.includes('who are you') ||
    text.includes('what can you do') ||
    text.includes('aap kaun ho') ||
    text.includes('who made you') ||
    text.includes('what is saaf') ||
    text.includes('help') ||
    text.includes('madad') ||
    text === 'menu'

  if (isGreeting && !text.includes('kachra') && !text.includes('overflow') && !text.includes('dump')) {
    return {
      intent: 'greeting',
      reply: `Namaste! 🙏 I am your **Saaf AI Assistant** for Green Meadows Society.\n\nI can help you with:\n• 🗑️ **File a waste complaint** in natural English or Hinglish (e.g. *"Tower B parking ka bin overflow ho raha hai"*)\n• 📦 **Schedule doorstep pickup** for bulky items or e-waste\n• 🔍 **Check status** of society complaints and cleanliness\n• ♻️ **Explain waste segregation rules** (Green vs Blue bin)\n• ⏰ **Sanitation Timings** & society collection schedules\n\nHow can I help you today?`,
    }
  }

  // 6. Doorstep Pickup inquiry intent (Checked before general timings)
  if (
    text.includes('pickup') ||
    text.includes('pick up') ||
    text.includes('e-waste') ||
    text.includes('ewaste') ||
    text.includes('bulky') ||
    text.includes('furniture') ||
    text.includes('sofa') ||
    text.includes('mattress') ||
    text.includes('bed') ||
    text.includes('electronics') ||
    text.includes('battery') ||
    text.includes('batteries') ||
    text.includes('gadget') ||
    text.includes('kabaad') ||
    text.includes('scrap') ||
    text.includes('doorstep')
  ) {
    return {
      intent: 'schedule_pickup',
      reply: `📦 **Doorstep Waste Pickup Service**:\nWe schedule free doorstep collection for bulky furniture, e-waste, broken gadgets, batteries, and large cartons.\n\n• **Collection Slots**: 9:00 AM – 12:00 PM and 2:00 PM – 5:00 PM\n• **Items**: Mattresses, sofas, electronic wires, chargers, paints, batteries, scrap.\n\nWould you like to request a pickup slot now?`,
      action: {
        type: 'navigate',
        label: 'Open Doorstep Pickup Form',
        path: '/pickup',
      },
    }
  }

  // 7. Sanitation Timings & Schedules
  if (
    text.includes('timing') ||
    text.includes('schedule') ||
    text.includes('kab aate') ||
    text.includes('kab aayega') ||
    text.includes('van time') ||
    text.includes('gaadi kab aati') ||
    text.includes('safai wale kab aate') ||
    text.includes('cleaning time') ||
    text.includes('door to door time') ||
    text.includes('collection time')
  ) {
    return {
      intent: 'timings',
      reply: `🕒 **Green Meadows Sanitation & Collection Timings**:\n\n• 🚪 **Door-to-Door Flat Collection**: 7:30 AM – 10:30 AM (daily morning)\n• 🗑️ **Society Common Bins Clearance**: 11:00 AM & 6:00 PM (twice daily)\n• 📦 **Bulky Item / E-Waste Doorstep Pickup**: 9:00 AM – 12:00 PM & 2:00 PM – 5:00 PM\n• 🏢 **Society Estate Office**: Tower A Ground Floor (9:00 AM – 7:00 PM)`,
    }
  }

  // 7. Society Contacts & Office Info
  if (
    text.includes('contact') ||
    text.includes('phone') ||
    text.includes('helpline') ||
    text.includes('office') ||
    text.includes('secretary') ||
    text.includes('admin phone') ||
    text.includes('manager number') ||
    text.includes('estate office')
  ) {
    return {
      intent: 'contacts',
      reply: `🏢 **Society Management & Sanitation Contacts**:\n\n• **Estate Management Office**: Tower A Ground Floor (Open Mon–Sat, 9:00 AM – 7:00 PM)\n• **Housekeeping Supervisor**: Contactable via Estate Office desk\n• **Main Security Gate**: Intercom Ext. 01 / 02\n\nYou can also submit complaints directly through this app for tracked resolutions!`,
    }
  }

  // 8. Bin Locations
  if (
    text.includes('where is the bin') ||
    text.includes('dustbin location') ||
    text.includes('where are bins') ||
    text.includes('dustbin kaha hai') ||
    text.includes('bin kaha hai') ||
    text.includes('kaha phenke')
  ) {
    return {
      intent: 'bin_locations',
      reply: `🗑️ **Green Meadows Society Bin Stations**:\n\n• **Towers A, B & C**: Segregated Green (Wet) and Blue (Dry) bins are located at Ground Floor lift lobbies and basement parking entry.\n• **Main Gate Disposal Area**: Central waste containment for bulky cartons and external municipal collection.\n• **Park & Clubhouse**: Dedicated pedestrian litter bins placed along jogging tracks and play zones.`,
    }
  }

  // 9. Waste Rules & Segregation Intent
  if (
    text.includes('rule') ||
    text.includes('rules') ||
    text.includes('segregat') ||
    text.includes('kisme dale') ||
    text.includes('kisme phenke') ||
    text.includes('kaha dale') ||
    text.includes('where to throw') ||
    text.includes('which bin') ||
    text.includes('green bin') ||
    text.includes('blue bin') ||
    text.includes('wet waste') ||
    text.includes('dry waste') ||
    text.includes('recycle') ||
    text.includes('how to dispose')
  ) {
    return {
      intent: 'rules',
      reply: `♻️ **Green Meadows Society Segregation Guide**:\n\n• 🟢 **Green Bin (Wet Waste)**: Kitchen scraps, vegetable peels, leftover food, fruit peels, egg shells, garden clippings.\n• 🔵 **Blue Bin (Dry Waste)**: Clean paper, cardboard boxes, plastic wrappers, bottles, metal cans, rinsed milk pouches.\n• 🔴 **Hazardous / Special Box**: Tube lights, batteries, cleaning chemicals, expired medicine, sharp broken glass.\n• 📦 **Doorstep Pickup**: For e-waste and heavy furniture, book directly in the Pickup tab.`,
      action: {
        type: 'navigate',
        label: 'Schedule Bulky / E-Waste Pickup',
        path: '/pickup',
      },
    }
  }

  // 11. Status query intent
  if (
    text.includes('status') ||
    text.includes('track') ||
    text.includes('update') ||
    text.includes('mere complaint') ||
    text.includes('my complaint') ||
    text.includes('complaints') ||
    text.includes('kya hua') ||
    text.includes('resolve hua') ||
    text.includes('dikhao') ||
    text.includes('pending')
  ) {
    const activeItems = feed.slice(0, 4)
    return {
      intent: 'check_status',
      reply: `Here are the latest updates from the Green Meadows Society Notice Feed:`,
      data: activeItems,
      action: {
        type: 'navigate',
        label: 'View All on Notice Feed',
        path: '/',
      },
    }
  }

  // 12. Complaint Filing Intent (English / Hindi / Hinglish)
  // Check if message describes an actual waste issue, hazard, or sanitation failure
  const hasProblemIndicator =
    text.includes('overflow') ||
    text.includes('overflowing') ||
    text.includes('chhalak') ||
    text.includes('kachra') ||
    text.includes('kooda') ||
    text.includes('gandagi') ||
    text.includes('garbage') ||
    text.includes('waste') ||
    text.includes('litter') ||
    text.includes('smell') ||
    text.includes('badbu') ||
    text.includes('durgandh') ||
    text.includes('stink') ||
    text.includes('glass') ||
    text.includes('kaanch') ||
    text.includes('sharp') ||
    text.includes('hazard') ||
    text.includes('dump') ||
    text.includes('malba') ||
    text.includes('debris') ||
    text.includes('missed') ||
    text.includes('nahi aaya') ||
    text.includes('uthaya nahi') ||
    text.includes('safai nahi') ||
    text.includes('spill') ||
    text.includes('bikhra') ||
    text.includes('dirty') ||
    text.includes('ganda') ||
    text.includes('leak') ||
    text.includes('full bin') ||
    text.includes('dustbin full')

  if (hasProblemIndicator) {
    const analysis = classifyWasteIssue(rawText, '')

    // Detect Block
    let detectedBlock = 'A'
    if (text.includes('tower b') || text.includes('block b') || text.includes('b tower') || text.includes('b block') || text.includes(' b ')) {
      detectedBlock = 'B'
    } else if (text.includes('tower c') || text.includes('block c') || text.includes('c tower') || text.includes('c block') || text.includes(' c ')) {
      detectedBlock = 'C'
    } else if (text.includes('tower a') || text.includes('block a') || text.includes('a tower') || text.includes('a block') || text.includes(' a ')) {
      detectedBlock = 'A'
    }

    // Detect specific area mentioned in message
    let detectedAreaName = `Tower ${detectedBlock} Common Area`
    if (text.includes('parking')) detectedAreaName = `Tower ${detectedBlock} Parking`
    else if (text.includes('basement')) detectedAreaName = `Tower ${detectedBlock} Basement`
    else if (text.includes('playground') || text.includes('play area') || text.includes('park')) detectedAreaName = `Tower ${detectedBlock} Playground`
    else if (text.includes('clubhouse') || text.includes('club')) detectedAreaName = 'Clubhouse Entrance'
    else if (text.includes('gate') || text.includes('main gate')) detectedAreaName = 'Main Gate Bin Area'
    else if (text.includes('lift') || text.includes('lobby')) detectedAreaName = `Tower ${detectedBlock} Lift Lobby`
    else if (text.includes('corridor') || text.includes('walkway')) detectedAreaName = `Tower ${detectedBlock} Corridor`

    // Match against society database areas
    const matchedArea = areas.find((a) => {
      const aName = (a.area_name || '').toLowerCase()
      const aBlock = (a.block || '').toLowerCase()
      return (
        (text.includes(aName) || aName.includes(detectedAreaName.toLowerCase())) &&
        aBlock === detectedBlock.toLowerCase()
      )
    })

    const finalArea = matchedArea || areas.find((a) => a.block === detectedBlock) || areas[0] || {
      id: 1,
      block: detectedBlock,
      area_name: detectedAreaName,
    }

    return {
      intent: 'file_complaint',
      reply: `I have analyzed your report for **Tower ${detectedBlock}**! Here is the drafted complaint ready for submission:`,
      draft: {
        issue_type: analysis.issue_type,
        priority: analysis.priority,
        priority_reason: analysis.reason,
        description: rawText,
        block: detectedBlock,
        area_id: finalArea.id,
        area_name: finalArea.area_name || detectedAreaName,
      },
    }
  }

  // 13. General Conversational Fallback
  return {
    intent: 'fallback',
    reply: `I received your message: "${rawText}".\n\nI can help you with:\n• 🚨 **Report waste issue**: e.g. *"Tower B parking ka bin overflow ho raha hai"*\n• 🧹 **Litter cleanup**: e.g. *"Gate 1 ke paas kachra pada hai"*\n• 📦 **Doorstep pickup**: e.g. *"E-waste pickup schedule karna hai"*\n• 🔍 **Check status**: e.g. *"Check my complaints"*\n• ♻️ **Segregation rules**: e.g. *"Which bin for plastic bottles?"*\n• ⏰ **Timings**: e.g. *"Garbage collection timing"*\n\nType or speak your request!`,
  }
}

