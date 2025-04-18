'use strict';

const https = require('https');
const http = require('http');
const url = require('url');

const S3_BASE_URL = process.env.S3_BASE_URL || 'https://geonet-open-data.s3-ap-southeast-2.amazonaws.com';
const USE_PROXY = process.env.USE_PROXY === 'true';

// Fetch raw XML from S3
function fetchXML(s3url) {
  return new Promise((resolve, reject) => {
    https.get(s3url, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse folder and file entries from S3 XML
function parseS3XML(xml, prefix) {
  const folders = [...xml.matchAll(/<Prefix>(.*?)<\/Prefix>/g)]
    .map(m => m[1])
    .filter(f => f !== prefix);

  const files = [...xml.matchAll(/<Key>(.*?)<\/Key>/g)]
    .map(m => m[1])
    .filter(k => k !== prefix);

  return { folders, files };
}

// Get parent folder
function getParentPrefix(prefix) {
  const parts = prefix.replace(/\/$/, '').split('/').filter(Boolean);
  return parts.length > 0 ? parts.slice(0, -1).join('/') + '/' : null;
}

// Build local browser route
function buildHref(prefix) {
  const clean = prefix.replace(/^\/+|\/+$/g, '');
  return clean ? `/browser/${clean}/` : '/browser';
}

// Generate modern UI HTML
function generateHTML(prefix, folders, files) {
  const parent = getParentPrefix(prefix);

  folders.sort();
  files.sort();

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Index of ${prefix || '/'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          :root {
            color-scheme: light dark;
          }
          body {
            font-family: system-ui, sans-serif;
            max-width: 800px;
            margin: auto;
            padding: 2rem;
            line-height: 1.6;
            transition: background 0.2s, color 0.2s;
          }
          body.light-mode {
            background: white;
            color: black;
          }
          body.dark-mode {
            background: #111;
            color: #eee;
          }
          body.light-mode .mode-toggle {
            color: black;
            border-color: #333;
            background: #f0f0f0;
          }
          body.dark-mode .mode-toggle {
            color: white;
            border-color: #eee;
            background: #222;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
          ul {
            list-style: none;
            padding: 0;
          }
          li {
            margin: 0.4rem 0;
            padding: 0.4rem 0.6rem;
            border-radius: 6px;
            transition: background 0.2s;
          }
          li:hover {
            background: rgba(128, 128, 128, 0.1);
          }
          .icon {
            display: inline-block;
            width: 1.2rem;
            margin-right: 0.5rem;
          }
          .parent {
            display: inline-block;
            margin-bottom: 1.5rem;
            font-weight: bold;
          }
          .mode-toggle {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: none;
            border: 1px solid currentColor;
            padding: 0.3rem 0.6rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
          }
        </style>
        <script>
          document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll(".trigger").forEach(trigger => {
              trigger.addEventListener("click", event => {
                event.preventDefault();
                const imageURL = trigger.getAttribute("href");
                const modal = document.querySelector(".modal");
                const img = modal.querySelector("img");
                img.src = imageURL;
                document.querySelector(".overlay").style.display = "block";
                modal.style.display = "block";
              });
            });

            document.querySelector(".close").addEventListener("click", closeModal);
            document.querySelector(".overlay").addEventListener("click", closeModal);

            function closeModal() {
              document.querySelector(".overlay").style.display = "none";
              document.querySelector(".modal").style.display = "none";
            }
          });

          document.addEventListener('DOMContentLoaded', () => {
            const stored = localStorage.getItem('theme');
            if (stored === 'dark' || stored === 'light') {
              document.body.classList.add(stored + '-mode');
            }
          });

          function toggleTheme() {
            const isDark = document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('light-mode', !isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
          }
        </script>
      </head>
      <body>
        <button class="mode-toggle" onclick="toggleTheme()">🌓 Toggle Theme</button>
        <h1>Index of ${prefix || '/'}</h1>
        ${parent ? `<a class="parent" href="${buildHref(parent)}">⬅️ Parent folder</a>` : ''}
        <ul>
          ${folders.map(f => `
            <li>
              <a href="${buildHref(f)}">
                <span class="icon">📁</span>${f}
              </a>
            </li>
          `).join('')}
          ${files.map(f => {
    const isImage = /\.(jpe?g|png|gif|bmp|webp|tiff?)$/i.test(f);
    const icon = isImage ? '🖼️' : '📄';
    const href = USE_PROXY ? `/proxy/${encodeURIComponent(f)}` : `${S3_BASE_URL}/${encodeURIComponent(f)}`;

    return `
              <li>
                <a href="${href}" ${isImage ? 'class="trigger"' : 'target="_blank"'}>
                  <span class="icon">${icon}</span>${f}
                </a>
              </li>
            `;
  }).join('')}
        </ul>

        <!-- Image modal -->
        <div class="overlay" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.7); z-index:1000;"></div>
        <div class="modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:white; padding:1rem; border-radius:8px; max-width:90vw; max-height:90vh; z-index:1001;">
          <span class="close" style="position:absolute; top:10px; right:15px; cursor:pointer; font-size:1.2rem;">&times;</span>
          <img src="" alt="Preview" style="max-width:100%; max-height:80vh;" />
        </div>

        <script>
          document.addEventListener("DOMContentLoaded", () => {
            document.querySelectorAll(".trigger").forEach(link => {
              link.addEventListener("click", e => {
                e.preventDefault();
                const src = link.getAttribute("href");
                const modal = document.querySelector(".modal");
                const overlay = document.querySelector(".overlay");
                modal.querySelector("img").setAttribute("src", src);
                modal.style.display = "block";
                overlay.style.display = "block";
              });
            });

            document.querySelector(".close").addEventListener("click", closeModal);
            document.querySelector(".overlay").addEventListener("click", closeModal);

            function closeModal() {
              document.querySelector(".modal").style.display = "none";
              document.querySelector(".overlay").style.display = "none";
            }
          });
        </script>
      </body>
    </html>
  `;
}

// Start HTTP server
http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = decodeURIComponent(parsed.pathname);

  if (pathname === '/' || pathname === '') {
    res.writeHead(302, { Location: '/browser' });
    return res.end();
  }

  if (pathname.startsWith('/proxy/')) {
    const key = decodeURIComponent(pathname.replace(/^\/proxy\//, ''));
    const s3url = `${S3_BASE_URL}/${encodeURIComponent(key)}`;

    https.get(s3url, s3res => {
      const headers = {
        'Content-Type': s3res.headers['content-type'] || 'application/octet-stream',
        'Content-Disposition': 'inline',
      };
      res.writeHead(200, headers);
      s3res.pipe(res);
    }).on('error', err => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });
    return;
  }

  if (!pathname.startsWith('/browser')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not Found');
  }

  let prefix = pathname.replace(/^\/browser\/?/, '');
  if (prefix && !prefix.endsWith('/')) prefix += '/';

  const s3url = `${S3_BASE_URL}/?prefix=${encodeURIComponent(prefix)}&delimiter=/`;

  try {
    const xml = await fetchXML(s3url);
    const { folders, files } = parseS3XML(xml, prefix);
    const html = generateHTML(prefix, folders, files);

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch (err) {
    console.error('Error:', err.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Error fetching from S3\n' + err.message);
  }
}).listen(3000, () => {
  console.log('🌐 Server running at http://localhost:3000/browser');
});
