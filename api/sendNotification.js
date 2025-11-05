// api/sendNotification.js
import { createClient } from '@supabase/supabase-js';
import * as admin from 'firebase-admin';

// Initialize Supabase
const supabase = createClient(
  'https://hjxmjmdqvgiaeourpbbc.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqeG1qbWRxdmdpYWVvdXJwYmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMzg5NjEsImV4cCI6MjA3NzcxNDk2MX0.mVibzZbffS1JfCVa7yW8yndG_e7iYI72vgo_9h3SCiQ',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, title, body, fullName, email, phoneNumber, lastKnownLatitude, lastKnownLongitude, isSelfAlert } = req.body;

    // Validate required fields
    if (!token || !title || !body || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['token', 'title', 'body', 'email']
      });
    }

    // Send FCM notification
    try {
      const message = {
        token: token,
        notification: {
          title: title,
          body: body
        },
        data: {
          fullName: fullName || '',
          email: email,
          phoneNumber: phoneNumber || '',
          lastKnownLatitude: lastKnownLatitude ? String(lastKnownLatitude) : '',
          lastKnownLongitude: lastKnownLongitude ? String(lastKnownLongitude) : '',
          isSelfAlert: String(isSelfAlert || false)
        }
      };

      // Send the message
      const response = await admin.messaging().send(message);
      
      // Log the notification in Supabase
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          recipient_email: email,
          title: title,
          body: body,
          fcm_token: token,
          status: 'sent',
          metadata: {
            fullName,
            phoneNumber,
            lastKnownLatitude,
            lastKnownLongitude,
            isSelfAlert
          }
        }])
        .select();

      if (error) {
        console.error('Supabase insert error:', error);
        // Don't fail the request if Supabase insert fails
      }

      return res.status(200).json({ 
        success: true,
        messageId: response,
        notification: data ? data[0] : null
      });

    } catch (error) {
      console.error('FCM error:', error);
      
      // Log the failed attempt in Supabase
      try {
        await supabase
          .from('notifications')
          .insert([{
            recipient_email: email,
            title: title,
            body: body,
            fcm_token: token,
            status: 'failed',
            error: error.message,
            metadata: {
              fullName,
              phoneNumber,
              lastKnownLatitude,
              lastKnownLongitude,
              isSelfAlert
            }
          }]);
      } catch (dbError) {
        console.error('Failed to log failed notification:', dbError);
      }

      return res.status(500).json({ 
        success: false,
        error: error.message || 'Failed to send notification'
      });
    }

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error'
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