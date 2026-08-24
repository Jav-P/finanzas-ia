// Usa el mismo host con el que se cargo la pagina (localhost en dev
// normal, o la IP de la maquina cuando se accede desde otro
// dispositivo de la red), asi el front encuentra el backend sin
// importar desde donde se abra.
export const API_URL = `http://${window.location.hostname}:3010/api`;
