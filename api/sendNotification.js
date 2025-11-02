const admin = require('firebase-admin');

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
    const { token, title, body, data = {} } = req.body;

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
        timestamp: new Date().toISOString(),
        source: 'vasatey-notify',
      },
      android: {
        notification: {
          priority: 'high',
          sound: 'default',
          channelId: 'vasatey_alerts',
        },
        priority: 'high',
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
          },
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
      return res.status(404).json({
        error: 'Invalid token',
        message: 'The FCM token is not registered or has expired',
        code: error.code,
      });
    }
    
    if (error.code === 'messaging/invalid-argument') {
      return res.status(400).json({
        error: 'Invalid argument',
        message: 'One or more arguments to the request are invalid',
        code: error.code,
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send notification',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}