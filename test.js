/**
 * Simple test script for the FCM notification API
 * Run with: node test.js
 */

const testNotification = async () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000/api/sendNotification';
  
  // Test data
  const testPayload = {
    token: 'TEST_FCM_TOKEN_HERE', // Replace with a real FCM token for testing
    title: '🚨 Vasatey Test Alert',
    body: 'This is a test notification to verify the API is working correctly.',
    data: {
      alertType: 'test',
      userId: 'test_user_123',
      location: '37.7749,-122.4194', // San Francisco coordinates
      timestamp: new Date().toISOString()
    }
  };

  try {
    console.log('🚀 Testing FCM notification API...');
    console.log('📡 Endpoint:', API_URL);
    console.log('📦 Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success! Notification sent successfully');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Error occurred');
      console.log('📋 Error response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('💥 Network error:', error.message);
    console.log('\n📝 Make sure:');
    console.log('  1. The API server is running (vercel dev for local testing)');
    console.log('  2. The FIREBASE_SERVICE_ACCOUNT environment variable is set');
    console.log('  3. You have a valid FCM token for testing');
  }
};

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.log('⚠️  This test requires Node.js 18+ or install node-fetch');
  console.log('   Try: npm install node-fetch');
  process.exit(1);
}

// Run the test
testNotification();