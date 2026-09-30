import * as mock from './mockApi'
import * as real from './supabaseApi'

const useMock = import.meta.env.VITE_USE_MOCK !== 'false'

export const api = useMock ? mock : real
