import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the manifest
const manifestPath = join(__dirname, '../build/client/.vite/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

// Find the entry client and root CSS
const entryClient = manifest['node_modules/@react-router/dev/dist/config/defaults/entry.client.tsx'];
const root = manifest['src/app/root.tsx?__react-router-build-client-route'];

if (!entryClient) {
  console.error('Could not find entry client in manifest');
  process.exit(1);
}

const jsFile = entryClient.file;
const cssFile = root?.css?.[0]; // CSS might not exist

if (!jsFile) {
  console.error('Could not find JS file in manifest');
  console.log('Entry client:', entryClient);
  process.exit(1);
}

// Generate index.html
const cssLink = cssFile ? `<link rel="stylesheet" href="/${cssFile}" />` : '';
const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ColdStart PoR Protocol</title>${cssFile ? '\n    ' + cssLink : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${jsFile}"></script>
  </body>
</html>
`;

// Write index.html to build/client
const indexPath = join(__dirname, '../build/client/index.html');
writeFileSync(indexPath, html, 'utf-8');

console.log('✅ Generated index.html with:');
if (cssFile) {
  console.log('   CSS:', cssFile);
}
console.log('   JS:', jsFile);
