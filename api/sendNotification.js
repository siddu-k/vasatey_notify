// api/sendNotification.js
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Initialize Supabase - UPDATED URL AND KEY
const supabase = createClient(
  'https://acgsmcxmesvsftzugeik.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjZ3NtY3htZXN2c2Z0enVnZWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzIzNTYsImV4cCI6MjA3Nzg0ODM1Nn0.EwiJajiscMqz1jHyyl-BDS4YIvc0nihBUn3m8pPUP1c',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, email, isSelfAlert } = req.body;

    // Validate required fields
    if (!token || !title || !body || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['token', 'title', 'body', 'email'],
        received: { token: !!token, title: !!title, body: !!body, email: !!email }
      });
    }

    console.log(`Sending notification to ${email}, isSelfAlert: ${isSelfAlert}`);

    // Send FCM notification
    try {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body
        },
        data: {
          email: email,
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

      // Send the message
      const response = await admin.messaging().send(message);
      console.log('FCM notification sent successfully:', response);
      
      return res.status(200).json({ 
        success: true,
        messageId: response,
        recipient: email
      });

    } catch (error) {
      console.error('FCM error:', error);
      
      return res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to send notification',
        code: error.code
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message
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
