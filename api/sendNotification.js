// api/sendNotification.js
import admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
  }
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      token, 
      title, 
      body, 
      email, 
      isSelfAlert,
      fullName,
      phoneNumber,
      lastKnownLatitude,
      lastKnownLongitude
    } = req.body;

    // Validate required fields
    if (!token || !title || !body || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['token', 'title', 'body', 'email'],
        received: { 
          token: !!token, 
          title: !!title, 
          body: !!body, 
          email: !!email 
        }
      });
    }

    console.log(`Sending notification to ${email}`);
    console.log(`Location: ${lastKnownLatitude}, ${lastKnownLongitude}`);

    // Send FCM notification
    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: {
        email: email || '',
        fullName: fullName || '',
        phoneNumber: phoneNumber || '',
        latitude: lastKnownLatitude ? String(lastKnownLatitude) : '',
        longitude: lastKnownLongitude ? String(lastKnownLongitude) : '',
        isSelfAlert: String(isSelfAlert || false)
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'emergency_alerts'
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM notification sent successfully:', response);
    
    return res.status(200).json({ 
      success: true,
      messageId: response,
      recipient: email
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to send notification',
      code: error.code
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
