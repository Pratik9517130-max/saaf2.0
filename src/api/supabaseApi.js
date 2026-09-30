import { supabase } from '../lib/supabase'

/**
 * Validates that Supabase environment variables are present and not placeholders
 */
function checkSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || url.includes('placeholder')) {
    throw new Error('Supabase URL is not configured. Please set VITE_SUPABASE_URL in your .env.local file, or switch to VITE_USE_MOCK=true.')
  }
  if (!key || key === 'placeholder') {
    throw new Error('Supabase Anon Key is not configured. Please set VITE_SUPABASE_ANON_KEY in your .env.local file, or switch to VITE_USE_MOCK=true.')
  }
}

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

  checkSupabaseConfig()

  let data, error
  try {
    const res = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    data = res.data
    error = res.error
  } catch (netErr) {
    const msg = netErr?.message || ''
    if (msg.toLowerCase().includes('failed to fetch') || netErr.name === 'TypeError') {
      throw new Error('Network error: Unable to connect to Supabase backend. Please check your internet connection or backend URL.')
    }
    throw netErr
  }

  if (error) {
    const msg = error.message || ''
    if (msg.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to reach authentication server. Please check your network connection or Supabase URL in .env.local.')
    }
    if (msg.toLowerCase().includes('invalid login credentials') || error.status === 400) {
      throw new Error('Invalid email or password. Please verify your credentials and try again.')
    }
    throw new Error(error.message || 'Failed to sign in')
  }

  if (!data?.user) {
    throw new Error('No user returned after sign in')
  }

  try {
    const profile = await getSession()
    if (!profile) {
      return {
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email: data.user.email,
        flat_no: data.user.user_metadata?.flat_no || '',
        block: data.user.user_metadata?.block || '',
        phone: data.user.user_metadata?.phone || '',
        role: data.user.user_metadata?.role || 'resident',
      }
    }
    return profile
  } catch (err) {
    console.warn('Failed to retrieve full profile after sign in, using auth metadata:', err)
    return {
      id: data.user.id,
      name: data.user.user_metadata?.name || email.split('@')[0],
      email: data.user.email,
      flat_no: data.user.user_metadata?.flat_no || '',
      block: data.user.user_metadata?.block || '',
      phone: data.user.user_metadata?.phone || '',
      role: data.user.user_metadata?.role || 'resident',
    }
  }
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

  checkSupabaseConfig()

  // 1. Verify join code via RPC
  let isValidCode, rpcError
  try {
    const res = await supabase.rpc('verify_join_code', {
      code: join_code,
    })
    isValidCode = res.data
    rpcError = res.error
  } catch (err) {
    const msg = err?.message || ''
    if (msg.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to verify join code. Please check your internet connection.')
    }
    throw err
  }

  if (rpcError) {
    if (rpcError.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to verify join code. Please check your internet connection.')
    }
    throw new Error(rpcError.message || 'Failed to verify join code')
  }

  if (!isValidCode) {
    throw new Error('Invalid join code')
  }

  // 2. Sign up via Supabase Auth with metadata
  let data, error
  try {
    const res = await supabase.auth.signUp({
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
    data = res.data
    error = res.error
  } catch (err) {
    const msg = err?.message || ''
    if (msg.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to connect to Supabase auth server. Please check your internet connection.')
    }
    throw err
  }

  if (error) {
    if (error.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to reach authentication server. Please check your connection.')
    }
    throw new Error(error.message || 'Failed to sign up')
  }

  if (!data?.user) {
    throw new Error('User registration failed')
  }

  // 3. Return profile row
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, flat_no, block, phone, role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profileError && profile) {
      return profile
    }
  } catch (err) {
    console.warn('Profile fetch error after signup:', err)
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
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || url.includes('placeholder') || !key || key === 'placeholder') {
    return null
  }

  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.warn('Failed to get auth session:', sessionError.message)
      return null
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
      console.warn('Failed to fetch user profile:', profileError.message)
      return {
        id: session.user.id,
        name: session.user.user_metadata?.name || 'Resident',
        flat_no: session.user.user_metadata?.flat_no || '',
        block: session.user.user_metadata?.block || '',
        phone: session.user.user_metadata?.phone || '',
        role: session.user.user_metadata?.role || 'resident',
      }
    }

    return profile || null
  } catch (err) {
    console.warn('getSession error:', err?.message)
    return null
  }
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
 * Upload photo file to bucket 'photos' under userId/uuid.ext
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
  let ext = 'jpg'
  if (file.name && file.name.includes('.')) {
    ext = file.name.split('.').pop().toLowerCase()
  } else if (file.type) {
    const mimeExt = file.type.split('/')[1]
    if (mimeExt) ext = mimeExt.toLowerCase().replace('jpeg', 'jpg')
  }
  const cleanExt = ext.replace(/[^a-z0-9]/gi, '') || 'jpg'

  const filePath = `${userId}/${crypto.randomUUID()}.${cleanExt}`

  const { error: uploadError } = await supabase.storage
    .from('photos')
    .upload(filePath, file, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) {
    if (uploadError.message?.toLowerCase().includes('bucket not found') || uploadError.error === 'Bucket not found') {
      throw new Error('Photo storage bucket ("photos") not found. Please ensure the "photos" bucket is created in Supabase Storage.')
    }
    if (uploadError.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to upload photo to storage server.')
    }
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
  const validPriorities = ['low', 'medium', 'high', 'critical']
  const finalPriority = validPriorities.includes(priority) ? priority : 'medium'

  const { data: complaint, error: complaintError } = await supabase
    .from('complaints')
    .insert({
      reporter_id,
      issue_type,
      description: description || '',
      area_id: Number(area_id) || area_id,
      is_anonymous: Boolean(is_anonymous),
      priority: finalPriority,
      priority_reason: priority_reason || null,
      ai_suggested_type: ai_suggested_type || null,
      status: 'submitted',
    })
    .select('id')
    .single()

  if (complaintError) {
    if (complaintError.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to submit complaint to server.')
    }
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
    .select(`
      *,
      reporter:profiles!reporter_id(name, flat_no, phone, avatar_url),
      area:areas!area_id(block, area_name),
      complaint_photos(url, position)
    `)
    .order('created_at', { ascending: false })

  if (complaintsError) {
    if (complaintsError.message?.toLowerCase().includes('failed to fetch')) {
      throw new Error('Network error: Unable to fetch admin complaints.')
    }
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

    const reporter = row.reporter || row.profiles || {}
    const reporterName = row.is_anonymous
      ? 'Anonymous resident'
      : (reporter.name || 'Resident')

    const reporterReal = {
      name: reporter.name || 'Unknown',
      flat_no: reporter.flat_no || 'N/A',
      phone: reporter.phone || 'N/A',
    }

    return {
      id: row.id,
      issue_type: row.issue_type,
      description: row.description || '',
      block: row.area?.block || row.areas?.block || '',
      area_name: row.area?.area_name || row.areas?.area_name || '',
      status: row.status,
      priority: row.priority,
      priority_reason: row.priority_reason,
      resolution_note: row.resolution_note,
      after_photo_url: row.after_photo_url,
      created_at: row.created_at,
      resolved_at: row.resolved_at,
      is_anonymous: row.is_anonymous,
      reporter_name: reporterName,
      reporter_avatar: row.is_anonymous ? null : (reporter.avatar_url || ''),
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
