const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // Usamos PostgreSQL ahora

const app = express();
const PUERTO = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuración de conexión a PostgreSQL (Render)
const pool = new Pool({
  user: 'invernadero_x2wt_user',
  host: 'dpg-d167pnodl3ps738f3me0-a.oregon-postgres.render.com',
  database: 'invernadero_x2wt',
  password: 'wy3AaWGuijtgfUPNXKMAuKxzOCrJPwOm',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

// Ejecutar query genérico
async function ejecutarQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (err) {
    console.error('Error en consulta PostgreSQL:', err);
    throw err;
  }
}

// Ruta para login
app.post('/login', (req, res) => {
  const { usuario, clave } = req.body;

  if (usuario.toLowerCase() === 'admin' && clave === '1234') {
    res.redirect('/inicio');
  } else {
    res.send('Usuario o contraseña incorrectos. <a href="/">Volver</a>');
  }
});

// Página de inicio
app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

// POST: recibir datos del ESP32
app.post('/api/sensores', async (req, res) => {
  const { humedadAmbiente, temperatura, humedadSuelo, ultimoRiego } = req.body;

  try {
    const query = `
      INSERT INTO sensores (humedad_ambiente, temperatura, humedad_suelo, ultimo_riego)
      VALUES ($1, $2, $3, $4)
    `;

    // Si no se envía fecha, usamos la actual
    let fechaFinal = ultimoRiego;
    if (!fechaFinal || fechaFinal.toLowerCase() === 'nunca') {
      fechaFinal = new Date().toISOString(); // ISO 8601, aceptado por PostgreSQL
    }

    await ejecutarQuery(query, [
      humedadAmbiente,
      temperatura,
      humedadSuelo,
      fechaFinal
    ]);

    res.json({ mensaje: 'Datos guardados correctamente en PostgreSQL' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar datos' });
  }
});

// GET: obtener últimos datos
app.get('/api/sensores', async (req, res) => {
  try {
    const query = `
      SELECT humedad_ambiente, temperatura, humedad_suelo,
             TO_CHAR(ultimo_riego, 'YYYY-MM-DD HH24:MI:SS') AS ultimo_riego
      FROM sensores
      ORDER BY id DESC
      LIMIT 1
    `;

    const result = await ejecutarQuery(query);

    if (result.rows.length > 0) {
      const { humedad_ambiente, temperatura, humedad_suelo, ultimo_riego } = result.rows[0];
      res.json({
        humedadAmbiente: humedad_ambiente,
        temperatura,
        humedadSuelo: humedad_suelo,
        ultimoRiego: ultimo_riego
      });
    } else {
      res.json({ humedadAmbiente: 0, temperatura: 0, humedadSuelo: 0, ultimoRiego: 'Nunca' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener datos' });
  }
});


git remote add origin https://github.com/RenatoVmr/invernadero.git
git branch -M main
git push -u origin main

app.listen(PUERTO, () => {
  console.log(`Servidor iniciado en http://localhost:${PUERTO}`);
});

