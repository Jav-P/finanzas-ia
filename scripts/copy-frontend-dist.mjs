// Copia el Angular ya compilado a dist/apps/backend/frontend, para que
// ServeStaticModule (ver apps/backend/src/app/app.module.ts) lo sirva
// desde el mismo proceso/puerto que el API en produccion.
import { cpSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const origen = join(raiz, 'dist/apps/frontend/browser');
const destino = join(raiz, 'dist/apps/backend/frontend');

if (!existsSync(origen)) {
  console.error(`No existe ${origen}. Corre antes: nx build frontend --configuration=production`);
  process.exit(1);
}

cpSync(origen, destino, { recursive: true });
console.log(`Copiado ${origen} -> ${destino}`);
