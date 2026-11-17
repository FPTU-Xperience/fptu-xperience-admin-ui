import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createReadStream, readFileSync } from 'node:fs';

const languageFiles = Object.fromEntries(['eng', 'vie'].map((code) => [
  `${code}.traineddata.gz`,
  new URL(`4.0.0_best_int/${code}.traineddata.gz`, import.meta.resolve(`@tesseract.js-data/${code}`)),
]));

function floorPlanLanguages() {
  return {
    name: 'floor-plan-languages',
    configureServer(server) {
      server.middlewares.use('/floor-plan-ocr', (request, response, next) => {
        const name = request.url.slice(1).split('?')[0];
        if (!Object.hasOwn(languageFiles, name)) return next();
        response.setHeader('Content-Type', 'application/octet-stream');
        createReadStream(languageFiles[name]).pipe(response);
      });
    },
    generateBundle() {
      for (const [name, file] of Object.entries(languageFiles)) {
        this.emitFile({ type: 'asset', fileName: `floor-plan-ocr/${name}`, source: readFileSync(file) });
      }
    },
  };
}

export default defineConfig(() => {
  return {
  plugins: [react(), tailwindcss(), floorPlanLanguages()],
  server: {
    port: 5174,
    strictPort: true,
    watch: { ignored: ['**/.qa/**', '**/.tmp/**'] },
  },
  };
});
