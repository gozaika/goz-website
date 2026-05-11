import { createClient } from '@supabase/supabase-js'

const supabase = createClient('http://127.0.0.1:54321', 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH')

// 1. Trigger the OTP
const { error: signInError } = await supabase.auth.signInWithOtp({
  phone: '+15555550100',
})

if (signInError) {
  console.error('Sign-in request failed:', signInError.message)
} else {
  console.log('OTP request sent (using local test_otp bypass)')
  
  // 2. Verify it
  const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
    phone: '+15555550100',
    token: '123456',
    type: 'sms',
  })

  if (verifyError) {
    console.error('Verification failed:', verifyError.message)
  } else {
    console.log('Success! Session created:', session.user.id)
  }
}
