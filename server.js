require('dotenv').config(); // Solo carga .env si existe (versión local)

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PUERTO = process.env.PORT || 5000;

// 1. Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 2. Rutas principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inicio.html')); // o index.html si renombraste
});

app.post('/login', (req, res) => {
  const { usuario, clave } = req.body;
  if (usuario.toLowerCase() === 'admin' && clave === '1234') {
    res.redirect('/inicio');
  } else {
    res.send('Usuario o contraseña incorrectos. <a href="/">Volver</a>');
  }
});

app.get('/inicio', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
});

// 3. Configuración PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function ejecutarQuery(query, params = []) {
  try {
    const result = await pool.query(query, params);
    return result;
  } catch (err) {
    console.error('Error en consulta PostgreSQL:', err);
    throw err;
  }
}

// 4. Rutas /api/sensores
app.post('/api/sensores', async (req, res) => {
  console.log('Datos recibidos POST /api/sensores:', req.body);
  const { humedadAmbiente, temperatura, humedadSuelo, ultimoRiego } = req.body;

  try {
    const query = `
      INSERT INTO sensores (humedad_ambiente, temperatura, humedad_suelo, ultimo_riego)
      VALUES ($1, $2, $3, $4)
    `;
    let fechaFinal = ultimoRiego;
    if (!fechaFinal || fechaFinal.toLowerCase() === 'nunca') {
      fechaFinal = new Date().toISOString();
    }
    await ejecutarQuery(query, [humedadAmbiente, temperatura, humedadSuelo, fechaFinal]);
    res.json({ mensaje: 'Datos guardados correctamente en PostgreSQL' });
  } catch (error) {
    console.error('Error al insertar en DB:', error);
    res.status(500).json({ error: 'Error al guardar datos', details: error.message });
  }
});

app.get('/api/sensores', async (req, res) => {
  try {
    const query = `
      SELECT 
        humedad_ambiente, temperatura, humedad_suelo,
        TO_CHAR(ultimo_riego, 'YYYY-MM-DD HH24:MI:SS') AS ultimo_riego
      FROM sensores
      ORDER BY id DESC
      LIMIT 1
    `;
    const result = await ejecutarQuery(query);
    if (result.rows.length > 0) {
      const r = result.rows[0];
      res.json({
        humedadAmbiente: r.humedad_ambiente,
        temperatura: r.temperatura,
        humedadSuelo: r.humedad_suelo,
        ultimoRiego: r.ultimo_riego
      });
    } else {
      res.json({ humedadAmbiente: 0, temperatura: 0, humedadSuelo: 0, ultimoRiego: 'Nunca' });
    }
  } catch (error) {
    console.error('Error en GET /api/sensores:', error);
    res.status(500).json({ error: 'Error al obtener datos', details: error.message });
  }
});

// 5. Ruta 404
app.use((req, res) => {
  res.status(404).send('Ruta no encontrada');
});

// 6. Inicializar servidor
app.listen(PUERTO, () => {
  console.log(`Servidor iniciado en el puerto ${PUERTO}`);
});
