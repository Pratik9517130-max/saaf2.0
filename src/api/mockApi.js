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

export async function signIn(email, password) {
  await delay()
  if (!email || !password) throw new Error('Email and password required')
  return { ...mockUser, email }
}

export async function signUp({ email, password, name, flat_no, block, phone, join_code }) {
  await delay()
  if (join_code && join_code.toLowerCase() === 'invalid') {
    throw new Error('Invalid join code')
  }
  return {
    id: 'usr-' + Date.now(),
    name: name || 'Resident',
    flat_no: flat_no || '101',
    block: block || 'A',
    phone: phone || '',
    role: 'resident',
  }
}

export async function signOut() {
  await delay()
}

export async function getSession() {
  await delay()
  return { ...mockUser }
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
  await delay()
  return {
    resolved: 18,
    open: 4,
    avg_fix_days: 1.2,
  }
}

export async function getComplaint(id) {
  await delay()
  const item = mockFeedItems.find((c) => c.id === id)
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
  await delay()
  return URL.createObjectURL ? URL.createObjectURL(file) : 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=600'
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
  await delay()
  return { id: 'comp-' + Date.now() }
}

export async function toggleUpvote(complaintId, currentlyUpvoted) {
  await delay()
}

export async function createPickup({ waste_type, notes, photo_url }) {
  await delay()
  return { id: 'pick-' + Date.now() }
}

export async function getMyPickups() {
  await delay()
  return [...mockPickups]
}

export async function adminGetComplaints() {
  await delay()
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
  await delay()
  if (status === 'resolved' && (!note || !after_photo_url)) {
    throw new Error('Resolve requires both note and after_photo_url')
  }
  if (status === 'rejected' && !note) {
    throw new Error('Reject requires note')
  }
}
