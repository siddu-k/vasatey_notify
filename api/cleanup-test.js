/**
 * Manual cleanup endpoint for testing or emergency cleanup
 * GET /api/cleanup-test
 */

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  // Simple HTML interface for manual testing
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Vasatey Alert Cleanup</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 30px; border-radius: 10px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; }
            button:hover { background: #0056b3; }
            .danger { background: #dc3545; }
            .danger:hover { background: #c82333; }
            #result { margin-top: 20px; padding: 15px; border-radius: 5px; }
            .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
            .loading { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🗑️ Vasatey Alert Cleanup</h1>
            <p>This tool helps you clean up old alerts from your Firestore database.</p>
            
            <h3>Options:</h3>
            <label>
                Days old to delete:
                <select id="daysOld">
                    <option value="7">7 days</option>
                    <option value="14">14 days</option>
                    <option value="30" selected>30 days (default)</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                </select>
            </label>
            
            <br><br>
            
            <button onclick="runCleanup()">🧹 Clean Old Alerts</button>
            <button onclick="runCleanup(true)" class="danger">⚠️ Delete ALL Alerts</button>
            
            <div id="result"></div>
        </div>
        
        <script>
            async function runCleanup(deleteAll = false) {
                const resultDiv = document.getElementById('result');
                const daysOld = deleteAll ? 36500 : document.getElementById('daysOld').value; // 36500 = ~100 years
                
                resultDiv.innerHTML = '<div class="loading">🔄 Running cleanup... This may take a few minutes.</div>';
                
                try {
                    const response = await fetch('/api/cleanupAlerts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            daysOld: parseInt(daysOld)
                        })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                        resultDiv.innerHTML = \`
                            <div class="success">
                                <h4>✅ Cleanup Completed Successfully!</h4>
                                <p><strong>Alerts Deleted:</strong> \${result.stats.totalDeleted}</p>
                                <p><strong>Duration:</strong> \${result.stats.duration}</p>
                                <p><strong>Cutoff Date:</strong> \${new Date(result.stats.cutoffDate).toLocaleString()}</p>
                                \${result.stats.errors > 0 ? \`<p><strong>Errors:</strong> \${result.stats.errors}</p>\` : ''}
                            </div>
                        \`;
                    } else {
                        resultDiv.innerHTML = \`
                            <div class="error">
                                <h4>❌ Cleanup Failed</h4>
                                <p>\${result.message}</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    resultDiv.innerHTML = \`
                        <div class="error">
                            <h4>❌ Network Error</h4>
                            <p>\${error.message}</p>
                        </div>
                    \`;
                }
            }
        </script>
    </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}