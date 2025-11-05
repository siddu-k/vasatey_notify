const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');

const ANDROID_CHANNEL_ID = 'guardian_alert_channel';

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
    throw new Error('Firebase configuration error');
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// CORS headers
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
    const { 
      token, 
      title, 
      body, 
      fullName, 
      email, 
      phoneNumber, 
      lastKnownLatitude, 
      lastKnownLongitude,
      isSelfAlert = false
    } = req.body;

    // Validate required fields
    const requiredFields = { token, title, body, fullName, email };
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields,
        message: `The following fields are required: ${missingFields.join(', ')}`
      });
    }

    // Log the notification in Supabase
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert([{
        recipient_email: email,
        title,
        body,
        fcm_token: token,
        status: 'sending',
        metadata: {
          fullName,
          phoneNumber: phoneNumber || null,
          lastKnownLatitude: lastKnownLatitude || null,
          lastKnownLongitude: lastKnownLongitude || null,
          isSelfAlert
        }
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error saving notification to Supabase:', insertError);
      throw new Error('Failed to save notification');
    }

    // Construct the FCM message
    const message = {
      token: token,
      data: {
        title: title,
        body: body,
        fullName: fullName || '',
        email: email || '',
        phoneNumber: phoneNumber || '',
        lastKnownLatitude: String(lastKnownLatitude || ''),
        lastKnownLongitude: String(lastKnownLongitude || ''),
        timestamp: new Date().toISOString(),
        source: 'vasatey-notify',
        alertType: 'emergency',
        channelId: ANDROID_CHANNEL_ID,
        isSelfAlert: String(isSelfAlert)
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            'content-available': 1,
          },
        },
        headers: {
          'apns-priority': '5',
          'apns-push-type': 'background',
        },
      },
    };

    // Send FCM notification
    console.log('Sending FCM message to token:', token.substring(0, 20) + '...');
    const response = await admin.messaging().send(message);
    console.log('Successfully sent FCM message:', response);

    // Update notification status to sent
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    if (updateError) {
      console.error('Error updating notification status:', updateError);
      // Continue even if status update fails
    }

    return res.status(200).json({
      success: true,
      message: 'Notification processed successfully',
      notificationId: notification.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing notification:', error);
    
    // If we have a notification ID, update its status to failed
    if (notification?.id) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ 
          status: 'failed',
          error_message: error.message || 'An unknown error occurred',
          updated_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      if (updateError) {
        console.error('Error updating notification failure status:', updateError);
      }
    }

    // Handle specific Firebase errors
    if (error.code === 'messaging/registration-token-not-registered') {
      return res.status(410).json({
        error: 'Token expired',
        message: 'The FCM token is not registered or has expired',
        code: error.code,
        action: 'refresh_token'
      });
    }

    if (error.code === 'messaging/invalid-registration-token') {
      return res.status(400).json({
        error: 'Invalid token format',
        message: 'The FCM token format is invalid',
        code: error.code,
        action: 'refresh_token'
      });
    }

    if (error.code === 'messaging/message-rate-exceeded') {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Message rate exceeded for this token',
        code: error.code,
        action: 'retry_later'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unknown error occurred',
      code: error.code || 'unknown',
      timestamp: new Date().toISOString()
    });
  }
}