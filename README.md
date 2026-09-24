# Medium-Realtime-Followers-Count-Tool

A simple and responsive web tool that allows you to check the follower count of a Medium profile by entering its username.

<div align="center">
  <img src="https://raw.githubusercontent.com/YashuInfinite/Medium-Realtime-Followers-Count-Tool/refs/heads/main/medium.png" alt="IMDb Movies & TV Shows Rating Finder" width="800" />
</div>

## Features

- 🔢 Get Medium follower count
- ⚡ Fast API-based lookup
- 🔄 HTML scraping fallback
- 📱 Responsive design
- 🎨 Clean modern UI
- ⌨️ Press Enter to search
- 🚀 Vercel deployment support
- 🟢 Express.js backend
- 🌐 No database required

## How It Works

The application uses two methods to retrieve the follower count.

### Method 1 — Medium JSON Endpoint

The application first attempts to retrieve the Medium profile data using:

```text
https://medium.com/@USERNAME?format=json
