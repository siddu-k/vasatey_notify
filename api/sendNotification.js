// vercel_app_endpoint.js
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with your credentials
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

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Content-Type': 'application/json'
};

// Helper function to send response
const sendResponse = (res, statusCode, data) => {
  return res.status(statusCode).json({
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Main handler
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
    return sendResponse(res, 405, {
      success: false,
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
      return sendResponse(res, 400, {
        success: false,
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
      console.error('Supabase insert error:', insertError);
      throw new Error('Failed to save notification to database');
    }

    // Update notification status to sent
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      // Continue even if status update fails
    }

    return sendResponse(res, 200, {
      success: true,
      message: 'Notification processed successfully',
      notificationId: notification.id
    });

  } catch (error) {
    console.error('Server error:', error);
    return sendResponse(res, 500, {
      success: false,
      error: 'Internal server error',
      message: error.message || 'An unknown error occurred'
    });
  }
}

// Health check endpoint
export async function healthCheck(req, res) {
  try {
    // Test Supabase connection
    const { data, error } = await supabase
      .from('notifications')
      .select('count', { count: 'exact', head: true });

    if (error) throw error;

    return sendResponse(res, 200, {
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return sendResponse(res, 500, {
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
}