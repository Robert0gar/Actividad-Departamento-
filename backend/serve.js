
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend de control de accesos escuchando en http://localhost:${PORT}`);
});