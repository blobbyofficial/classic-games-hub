const fs = require('fs');
const path = require('path');

const metadataDir = path.join(__dirname, '..', 'games', 'metadata');
const manifestPath = path.join(__dirname, '..', 'games', 'manifest.json');

function readMetadataFiles() {
  return fs.readdirSync(metadataDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => {
      const filePath = path.join(metadataDir, entry.name);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed;
    });
}

function normalizeManifest(entries) {
  return entries.map((entry) => {
    const normalized = Object.assign(
      {
        releaseStatus: 'released',
        version: '1.0.0',
        author: 'Classic Games Hub',
        supportedDevices: ['desktop', 'mobile'],
        screens: [],
        controls: [],
        settings: [],
        featured: false,
        external: false,
        category: 'Classic',
        pacing: 'Balanced',
        tag: '',
        detailPage: '',
        playUrl: ''
      },
      entry
    );
    return normalized;
  });
}

function writeManifest(manifest) {
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`Generated manifest at ${manifestPath}`);
}

const entries = readMetadataFiles();
const manifest = normalizeManifest(entries);
writeManifest(manifest);
