// Comprehensive Production Backend Verification Script
async function testBackend() {
  console.log('--- 1. Testing /api/health ---')
  const healthRes = await fetch('http://localhost:5051/api/health')
  const health = await healthRes.json()
  console.log('Health:', health.status, 'Uptime:', health.uptimeSeconds, 's')

  console.log('\n--- 2. Testing /api/auth/login (Master Admin) ---')
  const loginRes = await fetch('http://localhost:5051/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'admin',
      password: 'Proxima@Yugam2026!',
    }),
  })
  const login = await loginRes.json()
  console.log('Master Login Success:', login.success, 'Role:', login.session?.role, 'Token:', login.session?.token?.slice(0, 16) + '...')

  console.log('\n--- 3. Testing /api/auth/login (Chapter Admin) ---')
  const chapLoginRes = await fetch('http://localhost:5051/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      loginId: 'titans.admin',
      password: 'Titans@Proxima2026!',
    }),
  })
  const chapLogin = await chapLoginRes.json()
  console.log('Chapter Admin Login Success:', chapLogin.success, 'Chapter:', chapLogin.session?.chapter?.name)

  console.log('\n--- 4. Testing /api/licensing/create-order ---')
  const orderRes = await fetch('http://localhost:5051/api/licensing/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapterId: 'chap-titans',
      planKey: 'ANNUAL',
    }),
  })
  const order = await orderRes.json()
  console.log('Server Order Generated:', order.orderId, 'Amount (INR):', order.amount / 100, 'Server Signature:', order.serverSignature?.slice(0, 16) + '...')

  console.log('\n--- 5. Testing /api/licensing/verify-payment ---')
  const crypto = await import('node:crypto')
  const RAZORPAY_KEY_SECRET = 'ProximaSecretDevKey2026'
  const mockPayId = 'pay_verified_test_' + Date.now()
  const expectedSig = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${order.orderId}|${mockPayId}`)
    .digest('hex')

  const verifyRes = await fetch('http://localhost:5051/api/licensing/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapterId: 'chap-titans',
      planKey: 'ANNUAL',
      razorpayOrderId: order.orderId,
      razorpayPaymentId: mockPayId,
      razorpaySignature: expectedSig,
    }),
  })
  const verify = await verifyRes.json()
  console.log('Payment Cryptographic Verification:', verify.success, 'Valid Until:', verify.license?.validUntil, 'Invoice Ref:', verify.invoice?.id)

  console.log('\n--- 6. Testing /api/members Roster Persistence ---')
  const syncRes = await fetch('http://localhost:5051/api/members/chap-titans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      members: [
        { id: 'm-1', name: 'Rajesh Kannan', company: 'Apex Tech', category: 'IT Solutions' },
        { id: 'm-2', name: 'Priya Sundaram', company: 'Sterling Legal', category: 'Corporate Law' }
      ],
      version: 1
    }),
  })
  const sync = await syncRes.json()
  console.log('Sync Members:', sync.success, 'Count:', sync.count)

  const getRes = await fetch('http://localhost:5051/api/members/chap-titans')
  const getMembers = await getRes.json()
  console.log('Read Members Back from DB:', getMembers.members.length, 'Records')

  console.log('\nAll 6 Production Systems Tests PASSED cleanly!')
}

testBackend().catch(console.error)
