import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vhonppheewjixterjhih.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_g0u33V5mR9Y6wTDVCCJhvA_3-R_tWmz'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
