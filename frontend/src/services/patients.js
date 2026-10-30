const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

async function request(path, options = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error(`Could not connect to the API at ${API_BASE_URL}. Check that the backend is running.`)
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(`Request failed (${response.status})`)
    error.status = response.status
    error.detail = data?.detail
    throw error
  }
  return data
}

export function getPatients() {
  return request('/api/patients')
}

export function createPatient(patient) {
  return request('/api/patients', { method: 'POST', body: JSON.stringify(patient) })
}

export function updatePatient(id, patient) {
  return request(`/api/patients/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(patient) })
}

export function deletePatient(id) {
  return request(`/api/patients/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function generateRemarks(id) {
  return request(`/api/patients/${encodeURIComponent(id)}/remarks`, { method: 'POST' })
}
