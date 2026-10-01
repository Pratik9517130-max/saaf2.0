/* eslint-disable no-unused-vars */
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

const mockUser = {
  id: 'usr-1',
  name: 'Aarav Sharma',
  flat_no: '402',
  block: 'A',
  phone: '9876543210',
  role: 'admin',
}

const mockAreas = [
  { id: 'area-1', block: 'A', area_name: 'Tower A Playground' },
  { id: 'area-2', block: 'A', area_name: 'Tower A Basement' },
  { id: 'area-3', block: 'B', area_name: 'Clubhouse Entrance' },
  { id: 'area-4', block: 'C', area_name: 'Main Gate Bin Area' },
]

const mockFeedItems = [
  {
    id: 'comp-1',
    issue_type: 'overflowing_bin',
    description: 'Overflowing bin near Tower A play area',
    block: 'A',
    area_name: 'Tower A Playground',
    status: 'submitted',
    priority: 'high',
    priority_reason: 'Overflowing bin near a play area',
    resolution_note: null,
    after_photo_url: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    resolved_at: null,
    is_anonymous: false,
    reporter_name: 'Aarav Sharma',
    reporter_avatar: '',
    upvote_count: 4,
    i_upvoted: false,
    is_mine: true,
    photos: ['https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600'],
  },
  {
    id: 'comp-2',
    issue_type: 'road_garbage',
    description: 'Scattered dry waste near clubhouse entrance',
    block: 'B',
    area_name: 'Clubhouse Entrance',
    status: 'in_progress',
    priority: 'medium',
    priority_reason: 'Hindering walkway',
    resolution_note: null,
    after_photo_url: null,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    resolved_at: null,
    is_anonymous: true,
    reporter_name: 'Anonymous Resident',
    reporter_avatar: '',
    upvote_count: 2,
    i_upvoted: true,
    is_mine: false,
    photos: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600'],
  },
  {
    id: 'comp-3',
    issue_type: 'illegal_dumping',
    description: 'Bulky construction debris dumped near Tower C basement entrance',
    block: 'C',
    area_name: 'Main Gate Bin Area',
    status: 'resolved',
    priority: 'high',
    priority_reason: 'Obstruction to driveway',
    resolution_note: 'Debris cleared by housekeeping vendor and area sanitized.',
    after_photo_url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    resolved_at: new Date(Date.now() - 3600000).toISOString(),
    is_anonymous: false,
    reporter_name: 'Meera Iyer',
    reporter_avatar: '',
    upvote_count: 7,
    i_upvoted: true,
    is_mine: false,
    photos: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600'],
  },
  {
    id: 'comp-4',
    issue_type: 'missed_collection',
    description: 'Waste collection missed for entire block for 4 days',
    block: 'A',
    area_name: 'Tower A Basement',
    status: 'submitted',
    priority: 'critical',
    priority_reason: 'Severe health risk from rotting waste',
    resolution_note: null,
    after_photo_url: null,
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    resolved_at: null,
    is_anonymous: false,
    reporter_name: 'Rohit Sharma',
    reporter_avatar: '',
    upvote_count: 9,
    i_upvoted: false,
    is_mine: false,
    photos: ['https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600'],
  },
]

const mockPickups = [
  {
    id: 'pick-1',
    waste_type: 'e_waste',
    notes: 'Old monitor and cables',
    status: 'scheduled',
    scheduled_date: '2026-10-02',
    created_at: new Date().toISOString(),
  },
]

const mockRegisteredUsers = new Map([
  [
    'admin@society.com',
    {
      id: 'usr-admin-1',
      name: 'Aarav Sharma',
      flat_no: '402',
      block: 'A',
      phone: '9876543210',
      role: 'admin',
      password: 'password123',
    },
  ],
  [
    'resident@society.com',
    {
      id: 'usr-resident-1',
      name: 'Priya Verma',
      flat_no: '204',
      block: 'B',
      phone: '9876543210',
      role: 'resident',
      password: 'password123',
    },
  ],
])

let currentSessionUser = null

export async function signIn(email, password) {
  await delay()
  if (!email || !password) throw new Error('Email and password are required')

  const cleanEmail = email.toLowerCase().trim()
  const user = mockRegisteredUsers.get(cleanEmail)

  if (!user) {
    throw new Error('Account not found with this email. Please sign up first.')
  }

  if (user.password && user.password !== password) {
    throw new Error('Invalid email or password. Please check your credentials and try again.')
  }

  currentSessionUser = {
    id: user.id,
    name: user.name,
    email: cleanEmail,
    flat_no: user.flat_no,
    block: user.block,
    phone: user.phone,
    role: user.role,
  }

  return currentSessionUser
}

export async function signUp({ email, password, name, flat_no, block, phone, join_code }) {
  await delay()
  const validCodes = ['SAAF2026', 'GREEN2024', 'DEMO']
  if (!join_code || !validCodes.includes(join_code.toUpperCase().trim())) {
    throw new Error('Invalid join code')
  }

  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const cleanEmail = email.toLowerCase().trim()
  if (mockRegisteredUsers.has(cleanEmail)) {
    throw new Error('An account with this email already exists. Please sign in.')
  }

  const newUser = {
    id: 'usr-' + Date.now(),
    name: name || 'Resident',
    flat_no: flat_no || '101',
    block: block || 'A',
    phone: phone || '',
    role: 'resident',
    password,
  }

  mockRegisteredUsers.set(cleanEmail, newUser)
  currentSessionUser = { ...newUser, email: cleanEmail }
  return currentSessionUser
}

export async function signOut() {
  await delay()
  currentSessionUser = null
}

export async function getSession() {
  await delay()
  return currentSessionUser || null
}

export async function getAreas() {
  await delay()
  return [...mockAreas]
}

export async function getFeed() {
  await delay()
  return [...mockFeedItems]
}

export async function getStats() {
  await delay(100)
  let resolvedCount = 0
  let openCount = 0
  let totalFixDays = 0
  let resolvedWithDuration = 0

  for (const item of mockFeedItems) {
    if (item.status === 'resolved') {
      resolvedCount += 1
      if (item.resolved_at && item.created_at) {
        const diff = (new Date(item.resolved_at).getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
        if (diff >= 0) {
          totalFixDays += diff
          resolvedWithDuration += 1
        }
      }
    } else if (item.status !== 'rejected') {
      openCount += 1
    }
  }

  return {
    resolved: resolvedCount || 18,
    open: openCount || 4,
    avg_fix_days: resolvedWithDuration > 0 ? Number((totalFixDays / resolvedWithDuration).toFixed(1)) : 1.2,
  }
}

export async function getComplaint(id) {
  await delay(100)
  const item = mockFeedItems.find((c) => String(c.id) === String(id)) || mockFeedItems[0]
  if (!item) return null

  const history = [
    {
      from_status: null,
      to_status: 'submitted',
      note: 'Complaint registered by resident',
      created_at: item.created_at,
    },
  ]

  if (item.status === 'in_progress' || item.status === 'resolved') {
    history.push({
      from_status: 'submitted',
      to_status: 'acknowledged',
      note: 'Complaint reviewed and assigned to cleaning squad',
      created_at: new Date(new Date(item.created_at).getTime() + 1800000).toISOString(),
    })
    history.push({
      from_status: 'acknowledged',
      to_status: 'in_progress',
      note: 'Team on site clearing the waste',
      created_at: new Date(new Date(item.created_at).getTime() + 3600000).toISOString(),
    })
  }

  if (item.status === 'resolved') {
    history.push({
      from_status: 'in_progress',
      to_status: 'resolved',
      note: item.resolution_note || 'Issue resolved with proof',
      created_at: item.resolved_at || new Date().toISOString(),
    })
  }

  return {
    ...item,
    history,
  }
}

export async function uploadPhoto(file) {
  await delay(100)
  try {
    return URL.createObjectURL ? URL.createObjectURL(file) : 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600'
  } catch {
    return 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600'
  }
}

export async function createComplaint({
  issue_type,
  description,
  area_id,
  is_anonymous,
  priority,
  priority_reason,
  ai_suggested_type,
  photo_urls,
}) {
  await delay(150)
  const matchedArea = mockAreas.find((a) => String(a.id) === String(area_id)) || mockAreas[0]
  const newId = 'comp-' + Date.now()
  const newComplaint = {
    id: newId,
    issue_type: issue_type || 'other',
    description: description || '',
    block: matchedArea?.block || 'A',
    area_name: matchedArea?.area_name || 'Society Ground',
    status: 'submitted',
    priority: priority || 'medium',
    priority_reason: priority_reason || 'Reported by resident',
    resolution_note: null,
    after_photo_url: null,
    created_at: new Date().toISOString(),
    resolved_at: null,
    is_anonymous: Boolean(is_anonymous),
    reporter_name: is_anonymous ? 'Anonymous Resident' : mockUser.name,
    reporter_avatar: '',
    upvote_count: 0,
    i_upvoted: false,
    is_mine: true,
    photos: Array.isArray(photo_urls) && photo_urls.length > 0 ? photo_urls : [],
  }

  mockFeedItems.unshift(newComplaint)
  return { id: newId }
}

export async function toggleUpvote(complaintId, currentlyUpvoted) {
  await delay(80)
  const item = mockFeedItems.find((c) => c.id === complaintId)
  if (item) {
    item.i_upvoted = !currentlyUpvoted
    item.upvote_count = item.i_upvoted
      ? (item.upvote_count || 0) + 1
      : Math.max(0, (item.upvote_count || 0) - 1)
  }
}

export async function createPickup({ waste_type, notes, photo_url }) {
  await delay(150)
  const newId = 'pick-' + Date.now()
  const newPickup = {
    id: newId,
    waste_type: waste_type || 'bulky',
    notes: notes || '',
    photo_url: photo_url || null,
    status: 'requested',
    scheduled_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  }
  mockPickups.unshift(newPickup)
  return { id: newId }
}

export async function getMyPickups() {
  await delay(100)
  return [...mockPickups]
}

export async function adminGetComplaints() {
  await delay(150)
  return mockFeedItems.map((item) => ({
    ...item,
    reporter_real: {
      name: item.reporter_name,
      flat_no: '402',
      phone: '9876543210',
    },
  }))
}

export async function adminSetStatus(id, status, { note, after_photo_url } = {}) {
  await delay(150)
  if (status === 'resolved' && (!note || !after_photo_url)) {
    throw new Error('Resolve requires both note and after_photo_url')
  }
  if (status === 'rejected' && !note) {
    throw new Error('Reject requires note')
  }
  const item = mockFeedItems.find((c) => c.id === id)
  if (item) {
    item.status = status
    if (note) item.resolution_note = note
    if (after_photo_url) item.after_photo_url = after_photo_url
    if (status === 'resolved') item.resolved_at = new Date().toISOString()
  }
}
