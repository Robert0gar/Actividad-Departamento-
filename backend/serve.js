// serve.js — arranca el servidor. app.js solo define la app de Express;
// este archivo es el que la levanta en un puerto real.
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend de control de accesos escuchando en http://localhost:${PORT}`);
});