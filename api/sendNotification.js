const admin = require('firebase-admin');

// The channel ID must match the one created in your Android app
const ANDROID_CHANNEL_ID = 'guardian_alert_channel';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    // Parse the Firebase service account key from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase configuration error');
  }
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only POST requests are supported' 
    });
  }

  try {
    // Validate request body
    const { token, title, body, data = {}, userName, username, email, mobileNumber } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Missing required field', 
        message: 'FCM token is required' 
      });
    }

    if (!title || !body) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'Both title and body are required' 
      });
    }

    // Construct the FCM message
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        userName: userName || username || 'Unknown User', // Support both userName and username
        username: username || userName || 'Unknown User',
        email: email || '',
        mobileNumber: mobileNumber || '',
        timestamp: new Date().toISOString(),
        source: 'vasatey-notify',
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // For app opening
      },
      android: {
        notification: {
          priority: 'high',
          sound: 'default',
          channelId: ANDROID_CHANNEL_ID, // Use the defined channel ID
          visibility: 'public',
        },
        priority: 'high',
        ttl: 3600000, // 1 hour TTL
        data: {
          ...data,
          userName: userName || username || 'Unknown User',
          username: username || userName || 'Unknown User',
          email: email || '',
          mobileNumber: mobileNumber || '',
          timestamp: new Date().toISOString(),
          source: 'vasatey-notify',
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title,
              body: body,
            },
            sound: 'default',
            badge: 1,
            'content-available': 1, // Background processing
          },
        },
        headers: {
          'apns-priority': '10', // Immediate delivery
          'apns-push-type': 'alert',
        },
      },
    };

    // Send the notification
    const response = await admin.messaging().send(message);
    
    console.log('Successfully sent message:', response);
    
    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      messageId: response,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'messaging/registration-token-not-registered') {
      return res.status(410).json({
        error: 'Token expired',
        message: 'The FCM token is not registered or has expired',
        code: error.code,
        action: 'refresh_token', // Tell app to refresh token
      });
    }
    
    if (error.code === 'messaging/invalid-registration-token') {
      return res.status(400).json({
        error: 'Invalid token format',
        message: 'The FCM token format is invalid',
        code: error.code,
        action: 'refresh_token',
      });
    }
    
    if (error.code === 'messaging/invalid-argument') {
      return res.status(400).json({
        error: 'Invalid argument',
        message: 'One or more arguments to the request are invalid',
        code: error.code,
        details: error.message,
      });
    }

    if (error.code === 'messaging/message-rate-exceeded') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Message rate exceeded for this token',
        code: error.code,
        action: 'retry_later',
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send notification',
      code: error.code || 'unknown',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}