const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

// ==========================================
// HELPER 1: Extract clean slug from FULL URL or username
// ==========================================
function extractSlug(input) {
  input = input.trim();
  
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const url = new URL(input);
      if (url.hostname === 'medium.com') {
        return url.pathname.replace(/^\/|\/$/g, '').replace(/^@/, '');
      }
      if (url.hostname.endsWith('.medium.com')) {
        return url.hostname.replace('.medium.com', '');
      }
    } catch (e) {
      return null;
    }
  }
  
  return input.replace(/^@/, '');
}

// ==========================================
// HELPER 2: The "Ctrl+F" Extractor
// ==========================================
function extractFollowersFromRawText(text) {
  // 1. Search for JSON pattern (just in case it's in a script tag)
  let match = text.match(/"(?:followerCount|usersFollowedByCount)"\s*:\s*(\d+)/i);
  if (match) {
    return parseInt(match[1], 10).toLocaleString();
  }

  // 2. Search for rendered HTML pattern: "33,221 followers", "1.2K followers", etc.
  match = text.match(/(\d{1,3}(?:,\d{3})*|\d+(?:\.\d+)?[KkMm]?)\s+followers/i);
  if (match) {
    return match[1];
  }

  return null;
}

// ==========================================
// API ROUTE: Get Followers using Puppeteer
// ==========================================
app.get('/getFollowers', async (req, res) => {
  const rawInput = req.query.username?.trim();

  if (!rawInput) {
    return res.status(400).json({ error: 'Please enter a Medium URL or username.' });
  }

  const slug = extractSlug(rawInput);

  if (!slug || !/^[a-zA-Z0-9._-]+$/.test(slug)) {
    return res.status(400).json({ error: 'Invalid URL or username format.' });
  }

  // Launch Puppeteer to bypass Cloudflare
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });

  try {
    const urlsToTry = [
      `https://medium.com/@${slug}`,
      `https://${slug}.medium.com`
    ];

    for (const url of urlsToTry) {
      try {
        const page = await browser.newPage();
        
        // Spoof real browser to bypass bot detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.evaluateOnNewDocument(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
        });

        // Load the page
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        // Get the fully rendered HTML to "Ctrl+F"
        const html = await page.content();
        
        const followers = extractFollowersFromRawText(html);
        
        if (followers) {
          console.log(`✅ [SUCCESS] Found for "${slug}": ${followers}`);
          return res.json({ numFollowers: followers });
        } else {
          console.warn(`⚠️ [DEBUG] Loaded ${url}, but no follower count found in HTML.`);
        }
      } catch (e) {
        console.warn(`⚠️ [DEBUG] Failed to load ${url}:`, e.message);
      }
    }
    
    res.status(404).json({ error: 'Enter Correct Details.' });
    
  } finally {
    // Always close the browser to prevent memory leaks
    await browser.close();
  }
});

// ==========================================
// UI ROUTE: Serve Frontend
// ==========================================
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="icon" type="image/jpeg" href="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSaSpbfxZ0vrnsU6pkYbQARlgbwiMZD3hC2g&s">
  <title>Medium Realtime Followers Tool</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      overflow: hidden; background: linear-gradient(135deg, #9d4edd 0%, #c77dff 50%, #9d4edd 100%);
    }
    .container { width: 100%; max-width: 500px; padding: 20px; z-index: 1; }
    .card {
      background: rgba(93, 39, 126, 0.3); backdrop-filter: blur(10px);
      border-radius: 30px; padding: 50px 40px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      text-align: center; border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .logo {
      width: 60px; height: 60px; background: #000; color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: bold; margin: 0 auto 30px;
    }
    .title { font-size: 17px; font-weight: 700; color: #fff; letter-spacing: 1px; margin-bottom: 45px; line-height: 1.2; }
    .input-field {
      width: 100%; padding: 16px 20px; border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px; background: rgba(255, 255, 255, 0.1); color: #fff;
      font-size: 16px; margin-bottom: 25px; font-family: inherit; outline: none;
      transition: border 0.3s ease, box-shadow 0.3s ease;
    }
    .input-field::placeholder { color: rgba(255, 255, 255, 0.85); opacity: 1; }
    .input-field:focus { border-color: rgba(255, 255, 255, 0.6); box-shadow: 0 0 12px rgba(255, 255, 255, 0.25); }
    .input-field:focus::placeholder { opacity: 0.4; }
    .btn-primary {
      width: 100%; padding: 16px; background: linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%);
      color: #fff; border: none; border-radius: 20px; font-size: 16px; font-weight: 700;
      cursor: pointer; transition: all 0.3s ease; box-shadow: 0 8px 20px rgba(255, 107, 157, 0.3);
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 25px rgba(255, 107, 157, 0.4); }
    .result {
      margin-top: 30px; min-height: 40px; display: flex; align-items: center; justify-content: center;
      font-size: 38px; color: #fff; transition: all 0.3s ease;
    }
    .result.success { color: #6effa3; }
    .result.error { color: #ff6b6b; font-size: 18px; }
    .result.loading { font-size: 16px; animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
    .footer { margin-top: 40px; font-size: 14px; color: rgba(255, 255, 255, 0.7); }
    
    /* UPDATED: Added hover effect for the clickable email link */
    .author {
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      transition: color 0.3s ease, text-shadow 0.3s ease;
    }
    .author:hover {
      color: #6effa3;
      text-decoration: underline;
      text-shadow: 0 0 10px rgba(110, 255, 163, 0.5);
    }

    @media (max-width: 600px) {
      .card { padding: 40px 25px; border-radius: 25px; }
      .title { font-size: 24px; margin-bottom: 25px; }
      .logo { width: 50px; height: 50px; font-size: 24px; }
      .input-field, .btn-primary { padding: 14px 16px; font-size: 15px; }
      .result { font-size: 28px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">M</div>
      <h3 class="title">MEDIUM REAL TIME FOLLOWERS TOOL</h3>
      <input type="text" id="username" class="input-field" placeholder="Enter url or username" autocomplete="off">
      <button class="btn-primary" onclick="check()">GET FOLLOWERS COUNT</button>
      <div id="result" class="result"></div>
      <footer class="footer">
        Designed & Developed by <a href="mailto:yashwanth6678@gmail.com" class="author">Yashwanth R</a>
      </footer>
    </div>
  </div>

  <script>
    async function check() {
      const rawInput = document.getElementById('username').value.trim();
      const resultDiv = document.getElementById('result');

      if (!rawInput) {
        alert('Please paste a Medium URL');
        return;
      }

      resultDiv.className = 'result loading';
      resultDiv.textContent = 'Loading...';

      try {
        const response = await fetch('/getFollowers?username=' + encodeURIComponent(rawInput));
        const data = await response.json();

        if (response.ok) {
          resultDiv.className = 'result success';
          resultDiv.innerHTML = '<b>' + data.numFollowers + '</b>';
        } else {
          resultDiv.className = 'result error';
          resultDiv.textContent = data.error || 'Profile not found';
        }
      } catch (error) {
        resultDiv.className = 'result error';
        resultDiv.textContent = 'Network error. Try again.';
      }
    }

    document.getElementById('username').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') check();
    });
    document.getElementById('username').addEventListener('focus', () => {
      const resultDiv = document.getElementById('result');
      if (resultDiv.classList.contains('error')) {
        resultDiv.textContent = '';
        resultDiv.className = 'result';
      }
    });
  </script>
</body>
</html>
`);
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
  });
}
