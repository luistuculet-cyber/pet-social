const next = require('next');
const http = require('http');

// Configuración para cPanel / Phusion Passenger
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http.createServer((req, res) => {
    // Manejar todas las solicitudes de Next.js
    handle(req, res);
  }).listen(process.env.PORT || 3000, () => {
    console.log(`Servidor iniciado y escuchando...`);
  });
}).catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
