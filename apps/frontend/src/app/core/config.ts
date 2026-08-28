// Ruta relativa: en produccion el backend sirve el front compilado desde
// el mismo origen (mismo dominio y puerto), asi que "/api" ya apunta al
// lugar correcto sin importar el host. En desarrollo, el dev-server de
// Angular (ver proxy.conf.json) reenvia "/api" al backend en el puerto
// 3010 — incluyendo cuando se accede desde otro dispositivo de la red
// local, porque el proxy corre en el mismo servidor que sirve el front.
export const API_URL = '/api';
