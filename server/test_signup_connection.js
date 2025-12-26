const axios = require('axios');

async function testSignup() {
  const email = `test_debug_${Date.now()}@example.com`;
  const password = 'password123';
  const name = 'Debug User';

  console.log(`Attempting to sign up user: ${email} to http://localhost:4000/api/auth/signup`);

  try {
    const res = await axios.post('http://localhost:4000/api/auth/signup', {
      name,
      email,
      password,
      role: 'student'
    });

    console.log('Signup Response Status:', res.status);
    console.log('Signup Response Body:', res.data);
    console.log('SUCCESS: User should be in Supabase now.');
  } catch (err) {
    if (err.response) {
      console.error('Signup Failed:', err.response.status, err.response.data);
    } else {
      console.error('Signup Failed (Network/Connection):', err.message);
    }
  }
}

testSignup();
