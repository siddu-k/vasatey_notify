const admin = require('firebase-admin');

// Configuration
const ANDROID_CHANNEL_ID = 'guardian_alert_channel';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize Firebase Admin
function initializeFirebase() {
  if (!admin.apps.length) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized successfully');
    } catch (error) {
      console.error('Firebase Admin init error:', error);
      throw new Error('Firebase initialization failed');
    }
  }
  return admin;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Validate request payload
function validateRequest(body) {
  const required = ['token', 'title', 'body'];
  const missing = required.filter(field => !body[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missing.join(', ')}`
    };
  }

  if (typeof body.token !== 'string' || body.token.length < 10) {
    return {
      valid: false,
      error: 'Invalid FCM token format'
    };
  }

  return { valid: true };
}

// Send FCM message with retry
async function sendWithRetry(message, retries = MAX_RETRIES) {
  const admin = initializeFirebase();
  
  for (let i = 0; i < retries; i++) {
    try {
      return await admin.messaging().send(message);
    } catch (error) {
      if (i === retries - 1) throw error;
      
      if (error.code === 'messaging/registration-token-not-registered' || 
          error.code === 'messaging/invalid-registration-token') {
        throw error; // Don't retry invalid tokens
      }
      
      console.log(`Retry ${i + 1}/${retries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (i + 1)));
    }
  }
}

// Main handler
export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported' 
    });
  }

  try {
    // Validate request
    const { valid, error } = validateRequest(req.body);
    if (!valid) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: error 
      });
    }

    const { 
      token, title, body, fullName = '', 
      email = '', phoneNumber = '', 
      lastKnownLatitude, lastKnownLongitude 
    } = req.body;

    // Log incoming request (without full token)
    console.log('Sending alert:', { 
      to: `${token.substring(0, 8)}...`, 
      title,
      hasLocation: !!(lastKnownLatitude && lastKnownLongitude)
    });

    // Build FCM message
    const message = {
      token,
      data: {
        title: String(title),
        body: String(body),
        fullName: String(fullName),
        email: String(email),
        phoneNumber: String(phoneNumber),
        lastKnownLatitude: lastKnownLatitude ? String(lastKnownLatitude) : '',
        lastKnownLongitude: lastKnownLongitude ? String(lastKnownLongitude) : '',
        timestamp: new Date().toISOString(),
        source: 'vasatey-notify',
        alertType: 'emergency',
        channelId: ANDROID_CHANNEL_ID,
      },
      android: { priority: 'high' },
      apns: {
        payload: { aps: { 'content-available': 1 } },
        headers: { 
          'apns-priority': '5',
          'apns-push-type': 'background',
          'apns-topic': 'com.sriox.vasateysec' // Add your bundle ID
        }
      }
    };

    // Send with retry
    const response = await sendWithRetry(message);
    
    console.log('Notification sent successfully:', {
      messageId: response,
      to: `${token.substring(0, 8)}...`
    });

    return res.status(200).json({
      success: true,
      message: 'Notification sent',
      messageId: response
    });

  } catch (error) {
    console.error('Notification failed:', {
      error: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

    // Handle specific errors
    if (error.code === 'messaging/registration-token-not-registered' || 
        error.code === 'messaging/invalid-registration-token') {
      return res.status(410).json({
        error: 'Invalid token',
        message: 'The FCM token is invalid or expired',
        code: error.code,
        action: 'refresh_token'
      });
    }

    if (error.code === 'messaging/message-rate-exceeded') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later',
        code: error.code
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Notification failed',
      message: 'Failed to send notification',
      code: error.code || 'internal_error'
    });
  }
}
