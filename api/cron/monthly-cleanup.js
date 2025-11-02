const admin = require('firebase-admin');

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw new Error('Firebase configuration error');
  }
}

// This endpoint is designed to be called by Vercel Cron Jobs
export default async function handler(req, res) {
  // Only allow GET requests from cron jobs
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed', 
      message: 'Only GET requests are supported for cron jobs' 
    });
  }

  try {
    console.log('Monthly alert cleanup started by cron job');

    // Call the cleanup function
    const cleanupUrl = `${req.headers.origin || 'https://' + req.headers.host}/api/cleanupAlerts`;
    
    const cleanupResponse = await fetch(cleanupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daysOld: 30 // Delete alerts older than 30 days
      })
    });

    const cleanupResult = await cleanupResponse.json();

    if (cleanupResponse.ok) {
      console.log('Monthly cleanup completed successfully:', cleanupResult);
      
      return res.status(200).json({
        success: true,
        message: 'Monthly alert cleanup completed',
        timestamp: new Date().toISOString(),
        result: cleanupResult
      });
    } else {
      console.error('Cleanup failed:', cleanupResult);
      
      return res.status(500).json({
        error: 'Cleanup failed',
        message: cleanupResult.message || 'Unknown error',
        details: cleanupResult
      });
    }

  } catch (error) {
    console.error('Error in monthly cleanup cron:', error);
    
    return res.status(500).json({
      error: 'Cron job failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}