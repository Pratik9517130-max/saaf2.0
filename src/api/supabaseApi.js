/* eslint-disable no-unused-vars */
export async function signIn(email, password) {
  throw new Error('not implemented')
}

export async function signUp({ email, password, name, flat_no, block, phone, join_code }) {
  throw new Error('not implemented')
}

export async function signOut() {
  throw new Error('not implemented')
}

export async function getSession() {
  throw new Error('not implemented')
}

export async function getAreas() {
  throw new Error('not implemented')
}

export async function getFeed() {
  throw new Error('not implemented')
}

export async function getStats() {
  throw new Error('not implemented')
}

export async function getComplaint(id) {
  throw new Error('not implemented')
}

export async function uploadPhoto(file) {
  throw new Error('not implemented')
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
  throw new Error('not implemented')
}

export async function toggleUpvote(complaintId, currentlyUpvoted) {
  throw new Error('not implemented')
}

export async function createPickup({ waste_type, notes, photo_url }) {
  throw new Error('not implemented')
}

export async function getMyPickups() {
  throw new Error('not implemented')
}

export async function adminGetComplaints() {
  throw new Error('not implemented')
}

export async function adminSetStatus(id, status, { note, after_photo_url } = {}) {
  throw new Error('not implemented')
}
