import { defineConfig } from 'vite';
import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const edgeTTSPlugin = () => ({
  name: 'edge-tts-proxy',
  configureServer(server) {
    server.middlewares.use('/api/tts', (req, res, next) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const text = url.searchParams.get('text');
        const voice = url.searchParams.get('voice') || 'vi-VN-HoaiMyNeural';
        
        if (!text) {
          res.statusCode = 400;
          return res.end('Missing text');
        }

        const runGoogleTTS = () => {
          console.log(`[TTS Fallback] Fetching from Google: ${text.substring(0, 20)}...`);
          const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;
          
          import('https').then(https => {
            https.get(googleUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0'
              }
            }, (googleRes) => {
              res.setHeader('Content-Type', 'audio/mpeg');
              googleRes.pipe(res);
            }).on('error', (err) => {
              res.statusCode = 500;
              res.end('All TTS services failed');
            });
          });
        };

        const runEdgeTTS = () => {
          const tempFile = path.join(os.tmpdir(), `tts_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
          fs.writeFileSync(tempFile, text, 'utf8');

          const cmdArgs = ['-m', 'edge_tts', '--voice', voice, '--file', tempFile];
          
          const child = spawn('python', cmdArgs, {
            shell: true,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
          });

          let hasSentData = false;
          res.setHeader('Content-Type', 'audio/mpeg');

          child.stdout.on('data', (data) => {
            hasSentData = true;
            res.write(data);
          });

          child.on('close', (code) => {
            try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch(e) {}
            
            if (code !== 0 || !hasSentData) {
              console.error(`[EdgeTTS] Failed (code ${code}), trying Google...`);
              if (!hasSentData) {
                runGoogleTTS();
              } else {
                res.end();
              }
            } else {
              res.end();
            }
          });

          child.stderr.on('data', (data) => {
             // Chỉ log lỗi, không gửi về client
             const errStr = data.toString();
             if (errStr.includes('Error')) console.error(`[EdgeTTS Error]: ${errStr}`);
          });
        };

        runEdgeTTS();

      } catch (e) {
        res.statusCode = 500;
        res.end(e.toString());
      }
    });
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [edgeTTSPlugin()],

  // Use './' for relative paths so it works on any sub-path (GitHub Pages or Custom Domain)
  // Use the repository name for the base path on GitHub Pages
  base: process.env.NODE_ENV === 'production' ? '/trung-portfolio/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        myhome: resolve(__dirname, 'myhome/index.html'),
      },
    },
  }
});
