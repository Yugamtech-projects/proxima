// Test Self-Serve Chapter Onboarding Flow
async function testOnboarding() {
  console.log('Testing Self-Serve Onboarding...')
  const res = await fetch('http://localhost:5051/api/chapters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapterName: 'Hyderabad Pioneers Chapter',
      city: 'Hyderabad',
      adminLoginId: 'hyderabad.admin',
      adminPassword: 'Hyderabad@Proxima2026!',
      planKey: 'ANNUAL',
      razorpayOrderId: 'order_test_onboard_123',
      razorpayPaymentId: 'pay_sandbox_onboard_456',
    }),
  })

  const data = await res.json()
  console.log('Status:', res.status)
  console.log('Response:', data)

  if (data.success) {
    console.log('Successfully onboarded chapter:', data.chapter.name)
    console.log('Access Key:', data.chapter.accessKey)
    console.log('Admin Email:', data.admin.email)
    console.log('License Plan:', data.license.plan)
  }
}

testOnboarding().catch(console.error)
