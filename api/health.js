/**
 * Health check endpoint for the Vasatey Notify API
 * GET /api/health
 */

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported for health check'
    });
  }

  // Basic health check
  const healthData = {
    status: 'healthy',
    service: 'vasatey-notify',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    firebase_configured: !!process.env.FIREBASE_SERVICE_ACCOUNT,
  };

  res.status(200).json(healthData);
}