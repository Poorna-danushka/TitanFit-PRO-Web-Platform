import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import https from 'https';

const binDir = path.join(process.cwd(), 'bin');
const dumpPath = path.join(binDir, process.platform === 'win32' ? 'mongodump.exe' : 'mongodump');
const restorePath = path.join(binDir, process.platform === 'win32' ? 'mongorestore.exe' : 'mongorestore');

if (fs.existsSync(dumpPath) && fs.existsSync(restorePath)) {
  console.log('✅ MongoDB Database Tools already present in local bin directory.');
  process.exit(0);
}

if (process.platform === 'linux') {
  console.log('📥 Auto-downloading MongoDB Database Tools for Linux...');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const tarUrl = 'https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.tgz';
  const tmpArchive = path.join(binDir, 'tools.tgz');

  const file = fs.createWriteStream(tmpArchive);

  const downloadFile = (url) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          try {
            execSync(`tar -xzf "${tmpArchive}" -C "${binDir}" --strip-components=2 "*/bin/mongodump" "*/bin/mongorestore"`, { stdio: 'inherit' });
            execSync(`chmod +x "${dumpPath}" "${restorePath}"`, { stdio: 'inherit' });
            if (fs.existsSync(tmpArchive)) {
              fs.unlinkSync(tmpArchive);
            }
            console.log('✅ MongoDB Database Tools successfully installed to backend/bin/');
          } catch (err) {
            console.warn('⚠️ Extraction error: ' + err.message);
          }
        });
      });
    }).on('error', (err) => {
      console.warn('⚠️ Could not auto-download MongoDB Database Tools: ' + err.message);
    });
  };

  downloadFile(tarUrl);
} else {
  console.log('ℹ️ Non-Linux OS detected. Using system PATH or MongoDB installation for Database Tools.');
}
