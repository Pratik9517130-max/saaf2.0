import { supabase } from '../lib/supabase'

/**
 * Sign in existing user with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} profile object
 */
export async function signIn(email, password) {
  if (!email || !password) {
    throw new Error('Email and password are required')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message || 'Failed to sign in')
  }

  if (!data?.user) {
    throw new Error('No user returned after sign in')
  }

  const profile = await getSession()
  if (!profile) {
    throw new Error('User profile not found')
  }

  return profile
}

/**
 * Sign up new user with join code verification
 * @param {object} params
 * @returns {Promise<object>} profile object
 */
export async function signUp({ email, password, name, flat_no, block, phone, join_code }) {
  if (!join_code) {
    throw new Error('Invalid join code')
  }

  // 1. Verify join code via RPC
  const { data: isValidCode, error: rpcError } = await supabase.rpc('verify_join_code', {
    code: join_code,
  })

  if (rpcError) {
    throw new Error(rpcError.message || 'Failed to verify join code')
  }

  if (!isValidCode) {
    throw new Error('Invalid join code')
  }

  // 2. Sign up via Supabase Auth with metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        flat_no,
        block,
        phone,
      },
    },
  })

  if (error) {
    throw new Error(error.message || 'Failed to sign up')
  }

  if (!data?.user) {
    throw new Error('User registration failed')
  }

  // 3. Return profile row
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, flat_no, block, phone, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message || 'Failed to fetch user profile after sign up')
  }

  if (profile) {
    return profile
  }

  // Fallback profile if database trigger is slightly delayed
  return {
    id: data.user.id,
    name: name || 'Resident',
    flat_no: flat_no || '',
    block: block || '',
    phone: phone || '',
    role: 'resident',
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error(error.message || 'Failed to sign out')
  }
}

/**
 * Get current user profile or null
 * @returns {Promise<object|null>} profile = {id, name, flat_no, block, phone, role}
 */
export async function getSession() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || 'Failed to get auth session')
  }

  if (!session?.user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name, flat_no, block, phone, role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (profileError) {
    throw new Error(profileError.message || 'Failed to fetch user profile')
  }

  return profile || null
}

/**
 * Get all residential areas
 * @returns {Promise<Array<{id: number, block: string, area_name: string}>>}
 */
export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('id, block, area_name')
    .order('block', { ascending: true })
    .order('area_name', { ascending: true })

  if (error) {
    throw new Error(error.message || 'Failed to fetch areas')
  }

  return data || []
}

/**
 * Get feed items sorted newest first
 * @returns {Promise<Array<object>>} list of FeedItem
 */
export async function getFeed() {
  const { data, error } = await supabase
    .from('feed_view')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch feed')
  }

  return (data || []).map((item) => ({
    ...item,
    photos: Array.isArray(item.photos) ? item.photos : [],
  }))
}

/**
 * Get stats: resolved count, open count, and average fix days (1 decimal)
 * @returns {Promise<{resolved: number, open: number, avg_fix_days: number}>}
 */
export async function getStats() {
  const { data, error } = await supabase
    .from('feed_view')
    .select('status, created_at, resolved_at')

  if (error) {
    throw new Error(error.message || 'Failed to fetch statistics')
  }

  let resolvedCount = 0
  let openCount = 0
  let totalFixDays = 0
  let resolvedWithDurationCount = 0

  for (const item of data || []) {
    if (item.status === 'resolved') {
      resolvedCount += 1
      if (item.resolved_at && item.created_at) {
        const createdTime = new Date(item.created_at).getTime()
        const resolvedTime = new Date(item.resolved_at).getTime()
        const diffDays = (resolvedTime - createdTime) / (1000 * 60 * 60 * 24)
        if (diffDays >= 0) {
          totalFixDays += diffDays
          resolvedWithDurationCount += 1
        }
      }
    } else {
      openCount += 1
    }
  }

  const avg_fix_days = resolvedWithDurationCount > 0
    ? Number((totalFixDays / resolvedWithDurationCount).toFixed(1))
    : 0

  return {
    resolved: resolvedCount,
    open: openCount,
    avg_fix_days,
  }
}

/**
 * Get single complaint detail with history
 * @param {string} id
 * @returns {Promise<object|null>} FeedItem + history
 */
export async function getComplaint(id) {
  if (!id) {
    throw new Error('Complaint ID is required')
  }

  const { data: complaint, error: complaintError } = await supabase
    .from('feed_view')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (complaintError) {
    throw new Error(complaintError.message || 'Failed to fetch complaint')
  }

  if (!complaint) {
    return null
  }

  const { data: history, error: historyError } = await supabase
    .from('status_history')
    .select('from_status, to_status, note, created_at')
    .eq('complaint_id', id)
    .order('created_at', { ascending: true })

  if (historyError) {
    throw new Error(historyError.message || 'Failed to fetch complaint history')
  }

  return {
    ...complaint,
    photos: Array.isArray(complaint.photos) ? complaint.photos : [],
    history: history || [],
  }
}

/**
 * Upload photo file to bucket 'photos' under userId/uuid.jpg
 * @param {File|Blob} file
 * @returns {Promise<string>} public url
 */
export async function uploadPhoto(file) {
  if (!file) {
    throw new Error('No photo file provided')
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Authentication required to upload photos')
  }

  const userId = session.user.id
  const fileName = `${crypto.randomUUID()}.jpg`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(uploadError.message || 'Failed to upload photo')
  }

  const { data } = supabase.storage
    .from('photos')
    .getPublicUrl(filePath)

  if (!data?.publicUrl) {
    throw new Error('Failed to retrieve public photo URL')
  }

  return data.publicUrl
}

/**
 * Create a new complaint with photos
 * @param {object} params
 * @returns {Promise<{id: string}>}
 */
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
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Authentication required to create a complaint')
  }

  const reporter_id = session.user.id

  const { data: complaint, error: complaintError } = await supabase
    .from('complaints')
    .insert({
      reporter_id,
      issue_type,
      description: description || '',
      area_id,
      is_anonymous: Boolean(is_anonymous),
      priority: priority || 'medium',
      priority_reason: priority_reason || null,
      ai_suggested_type: ai_suggested_type || null,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (complaintError) {
    throw new Error(complaintError.message || 'Failed to create complaint')
  }

  if (photo_urls && photo_urls.length > 0) {
    const photoRows = photo_urls.map((url, index) => ({
      complaint_id: complaint.id,
      url,
      position: index,
    }))

    const { error: photosError } = await supabase
      .from('complaint_photos')
      .insert(photoRows)

    if (photosError) {
      throw new Error(photosError.message || 'Failed to link complaint photos')
    }
  }

  return { id: complaint.id }
}

/**
 * Toggle upvote for a complaint
 * @param {string} complaintId
 * @param {boolean} currentlyUpvoted
 * @returns {Promise<void>}
 */
export async function toggleUpvote(complaintId, currentlyUpvoted) {
  if (!complaintId) {
    throw new Error('Complaint ID is required')
  }

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Authentication required to upvote')
  }

  const userId = session.user.id

  if (currentlyUpvoted) {
    const { error } = await supabase
      .from('upvotes')
      .delete()
      .eq('complaint_id', complaintId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message || 'Failed to remove upvote')
    }
  } else {
    const { error } = await supabase
      .from('upvotes')
      .insert({
        complaint_id: complaintId,
        user_id: userId,
      })

    if (error) {
      throw new Error(error.message || 'Failed to add upvote')
    }
  }
}

/**
 * Create a doorstep waste pickup request
 * @param {object} params
 * @returns {Promise<{id: string}>}
 */
export async function createPickup({ waste_type, notes, photo_url }) {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Authentication required to request a pickup')
  }

  const { data, error } = await supabase
    .from('pickups')
    .insert({
      resident_id: session.user.id,
      waste_type,
      notes: notes || '',
      photo_url: photo_url || null,
      status: 'requested',
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message || 'Failed to create pickup request')
  }

  return { id: data.id }
}

/**
 * Get pickup requests for current user
 * @returns {Promise<Array<object>>}
 */
export async function getMyPickups() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !session?.user) {
    throw new Error('Authentication required to get pickups')
  }

  const { data, error } = await supabase
    .from('pickups')
    .select('id, waste_type, notes, status, scheduled_date, created_at')
    .eq('resident_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message || 'Failed to fetch pickups')
  }

  return data || []
}

/**
 * Get all complaints for administrative view
 * @returns {Promise<Array<object>>} FeedItem + reporter_real
 */
export async function adminGetComplaints() {
  const { data: { session } } = await supabase.auth.getSession()
  const currentUserId = session?.user?.id || null

  const { data: complaints, error: complaintsError } = await supabase
    .from('complaints')
    .select('*, profiles(name, flat_no, phone), areas(block, area_name), complaint_photos(url, position)')
    .order('created_at', { ascending: false })

  if (complaintsError) {
    throw new Error(complaintsError.message || 'Failed to fetch admin complaints')
  }

  // Fetch upvotes to compute counts and i_upvoted
  const { data: upvotes, error: upvotesError } = await supabase
    .from('upvotes')
    .select('complaint_id, user_id')

  if (upvotesError) {
    throw new Error(upvotesError.message || 'Failed to fetch upvotes')
  }

  const upvoteCounts = {}
  const userUpvotes = new Set()

  for (const u of upvotes || []) {
    upvoteCounts[u.complaint_id] = (upvoteCounts[u.complaint_id] || 0) + 1
    if (currentUserId && u.user_id === currentUserId) {
      userUpvotes.add(u.complaint_id)
    }
  }

  return (complaints || []).map((row) => {
    const sortedPhotos = (row.complaint_photos || [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((p) => p.url)

    const reporterName = row.is_anonymous
      ? 'Anonymous resident'
      : (row.profiles?.name || 'Resident')

    const reporterReal = {
      name: row.profiles?.name || 'Unknown',
      flat_no: row.profiles?.flat_no || 'N/A',
      phone: row.profiles?.phone || 'N/A',
    }

    return {
      id: row.id,
      issue_type: row.issue_type,
      description: row.description || '',
      block: row.areas?.block || '',
      area_name: row.areas?.area_name || '',
      status: row.status,
      priority: row.priority,
      priority_reason: row.priority_reason,
      resolution_note: row.resolution_note,
      after_photo_url: row.after_photo_url,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      is_anonymous: row.is_anonymous,
      reporter_name: reporterName,
      reporter_avatar: row.is_anonymous ? null : (row.profiles?.avatar_url || ''),
      upvote_count: upvoteCounts[row.id] || 0,
      i_upvoted: userUpvotes.has(row.id),
      is_mine: currentUserId ? row.reporter_id === currentUserId : false,
      photos: sortedPhotos,
      reporter_real: reporterReal,
    }
  })
}

/**
 * Update complaint status by administrator
 * @param {string} id
 * @param {string} status
 * @param {object} [details]
 * @returns {Promise<void>}
 */
export async function adminSetStatus(id, status, { note, after_photo_url } = {}) {
  if (!id) {
    throw new Error('Complaint ID is required')
  }
  if (!status) {
    throw new Error('Status is required')
  }

  if (status === 'resolved') {
    if (!note || !after_photo_url) {
      throw new Error('Resolve requires both note and after_photo_url')
    }
  }

  if (status === 'rejected') {
    if (!note) {
      throw new Error('Reject requires note')
    }
  }

  const updatePayload = {
    status,
  }

  if (note !== undefined) {
    updatePayload.resolution_note = note
  }

  if (after_photo_url !== undefined) {
    updatePayload.after_photo_url = after_photo_url
  }

  if (status === 'resolved') {
    updatePayload.resolved_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('complaints')
    .update(updatePayload)
    .eq('id', id)

  if (error) {
    throw new Error(error.message || 'Failed to update complaint status')
  }
}
