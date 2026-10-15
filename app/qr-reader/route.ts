import fs from 'fs';
import path from 'path';

export function GET() {
  try {
    const filePath = path.join(process.cwd(), 'node_modules/jsqr/dist/jsQR.js');
    const source = fs.readFileSync(filePath, 'utf-8');
    return new Response(
      'const module={exports:{}};const exports=module.exports;\n' +
        source +
        '\nexport default module.exports;',
      {
        headers: {
          'Content-Type': 'text/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch {
    return new Response('export default null;', {
      headers: { 'Content-Type': 'text/javascript; charset=utf-8' },
    });
  }
}
