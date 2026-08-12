const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting End-to-End API Automated Verification...');

  // 1. Register User
  const regUser = {
    username: 'testuser_' + Date.now().toString().slice(-4),
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  };

  const regRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/register',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, regUser);

  console.log('1. Registration Status:', regRes.status);
  if (regRes.status !== 201) {
    console.error('❌ Registration failed:', regRes.body);
    process.exit(1);
  }
  const token = regRes.body.token;
  console.log('✅ Registered user:', regRes.body.user.username, 'Token acquired.');

  // 2. Login User
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: regUser.email, password: regUser.password });

  console.log('2. Login Status:', loginRes.status);
  if (loginRes.status !== 200) {
    console.error('❌ Login failed:', loginRes.body);
    process.exit(1);
  }
  console.log('✅ Login verified successfully.');

  // 3. Create Board Room
  const createBoardRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/boards/create',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }, { name: 'Automated Test Room' });

  console.log('3. Create Board Status:', createBoardRes.status);
  if (createBoardRes.status !== 201) {
    console.error('❌ Board creation failed:', createBoardRes.body);
    process.exit(1);
  }
  const board = createBoardRes.body.board;
  console.log('✅ Board created:', board.name, '| Room ID:', board.roomId);

  // 4. Fetch Boards List
  const listRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/boards',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('4. Fetch Boards Status:', listRes.status);
  if (listRes.status !== 200 || !listRes.body.boards || listRes.body.boards.length === 0) {
    console.error('❌ Fetch boards failed:', listRes.body);
    process.exit(1);
  }
  console.log('✅ Boards list fetched successfully. Count:', listRes.body.boards.length);

  // 5. Fetch Specific Board Details
  const getBoardRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/boards/${board.roomId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  console.log('5. Get Board Details Status:', getBoardRes.status);
  if (getBoardRes.status !== 200 || getBoardRes.body.board.roomId !== board.roomId) {
    console.error('❌ Get board details failed:', getBoardRes.body);
    process.exit(1);
  }
  console.log('✅ Board room details fetched successfully.');

  console.log('\n🎉 ALL AUTOMATED API TESTS PASSED CLEANLY!');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
