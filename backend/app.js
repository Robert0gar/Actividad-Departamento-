
const express = require('express');

const app = express();
app.use(express.json());

const DEPTO_REGEX = /^P[1-5]-[A-D]$/;
const TIPOS_VISITA = ['proveedor', 'frecuente', 'unico', 'familiar', 'taxi'];

let db = {
  residentes: [],
  visitantes: [],
  bitacora: [],
};

function resetDb() {
  db.residentes.length = 0;
  db.visitantes.length = 0;
  db.bitacora.length = 0;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}
function hoy() {
  return new Date().toISOString().slice(0, 10);
}
function horaActual() {
  return new Date().toTimeString().slice(0, 5);
}
function addLog(tipo, descripcion) {
  db.bitacora.unshift({ id: uid(), tipo, descripcion, fecha: hoy(), hora: horaActual() });
}

// ------------------------------------------------------------------
// Salud del servicio
// ------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ------------------------------------------------------------------
// RESIDENTES
// ------------------------------------------------------------------
app.get('/api/residentes', (req, res) => {
  res.json(db.residentes);
});

app.post('/api/residentes', (req, res) => {
  const { nombre, depto, telefono, email } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  if (!depto || !DEPTO_REGEX.test(depto)) {
    return res.status(400).json({ error: 'Depto inválido. Formato esperado: P1-A a P5-D' });
  }

  const residente = {
    id: uid(),
    nombre: nombre.trim(),
    depto,
    telefono: telefono || '',
    email: email || '',
    estado: 'activo',
    fechaAlta: hoy(),
  };
  db.residentes.unshift(residente);
  addLog('residente', `Alta de residente ${residente.nombre} (${residente.depto})`);
  res.status(201).json(residente);
});

app.put('/api/residentes/:id', (req, res) => {
  const residente = db.residentes.find(r => r.id === req.params.id);
  if (!residente) return res.status(404).json({ error: 'Residente no encontrado' });

  const { nombre, depto, telefono, email } = req.body;
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    residente.nombre = nombre.trim();
  }
  if (depto !== undefined) {
    if (!DEPTO_REGEX.test(depto)) return res.status(400).json({ error: 'Depto inválido' });
    residente.depto = depto;
  }
  if (telefono !== undefined) residente.telefono = telefono;
  if (email !== undefined) residente.email = email;

  addLog('residente', `Datos actualizados: ${residente.nombre} (${residente.depto})`);
  res.json(residente);
});

app.patch('/api/residentes/:id/baja', (req, res) => {
  const residente = db.residentes.find(r => r.id === req.params.id);
  if (!residente) return res.status(404).json({ error: 'Residente no encontrado' });

  residente.estado = residente.estado === 'activo' ? 'baja' : 'activo';
  addLog('residente', `${residente.estado === 'baja' ? 'Baja' : 'Reactivación'} de residente ${residente.nombre} (${residente.depto})`);
  res.json(residente);
});

app.delete('/api/residentes/:id', (req, res) => {
  const residente = db.residentes.find(r => r.id === req.params.id);
  if (!residente) return res.status(404).json({ error: 'Residente no encontrado' });

  db.residentes = db.residentes.filter(r => r.id !== req.params.id);
  addLog('residente', `Registro eliminado: ${residente.nombre} (${residente.depto})`);
  res.status(204).send();
});

app.get('/api/residentes/:id/visitas', (req, res) => {
  const residente = db.residentes.find(r => r.id === req.params.id);
  if (!residente) return res.status(404).json({ error: 'Residente no encontrado' });

  const visitas = db.visitantes
    .filter(v => v.residenteId === residente.id)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  res.json(visitas);
});

// ------------------------------------------------------------------
// VISITANTES
// ------------------------------------------------------------------
app.get('/api/visitantes', (req, res) => {
  let lista = db.visitantes;
  const { tipo, estado, depto, residenteId } = req.query;
  if (tipo) lista = lista.filter(v => v.tipo === tipo);
  if (estado) lista = lista.filter(v => v.estado === estado);
  if (depto) lista = lista.filter(v => v.depto === depto);
  if (residenteId) lista = lista.filter(v => v.residenteId === residenteId);
  res.json(lista);
});

app.post('/api/visitantes', (req, res) => {
  const { nombre, residenteId, tipo, fecha } = req.body;

  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: 'El nombre del visitante es obligatorio' });
  }
  if (!tipo || !TIPOS_VISITA.includes(tipo)) {
    return res.status(400).json({ error: `Tipo inválido. Debe ser uno de: ${TIPOS_VISITA.join(', ')}` });
  }
  if (!fecha) {
    return res.status(400).json({ error: 'La fecha es obligatoria' });
  }
  const residente = db.residentes.find(r => r.id === residenteId);
  if (!residente) {
    return res.status(400).json({ error: 'residenteId no corresponde a un residente existente' });
  }
  if (residente.estado !== 'activo') {
    return res.status(400).json({ error: 'El residente seleccionado está dado de baja' });
  }

  const visitante = {
    id: uid(),
    nombre: nombre.trim(),
    depto: residente.depto,
    residenteId: residente.id,
    tipo,
    fecha,
    estado: 'activo',
    horaEntrada: horaActual(),
    horaSalida: null,
  };
  db.visitantes.unshift(visitante);
  addLog('visitante', `Registro: ${visitante.nombre} visita a ${residente.nombre} (${visitante.depto})`);
  res.status(201).json(visitante);
});

app.put('/api/visitantes/:id', (req, res) => {
  const visitante = db.visitantes.find(v => v.id === req.params.id);
  if (!visitante) return res.status(404).json({ error: 'Visitante no encontrado' });

  const { nombre, residenteId, tipo, fecha } = req.body;

  if (residenteId !== undefined) {
    const residente = db.residentes.find(r => r.id === residenteId);
    if (!residente) return res.status(400).json({ error: 'residenteId no corresponde a un residente existente' });
    visitante.residenteId = residente.id;
    visitante.depto = residente.depto;
  }
  if (nombre !== undefined) {
    if (!nombre.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });
    visitante.nombre = nombre.trim();
  }
  if (tipo !== undefined) {
    if (!TIPOS_VISITA.includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    visitante.tipo = tipo;
  }
  if (fecha !== undefined) visitante.fecha = fecha;

  addLog('visitante', `Registro actualizado: ${visitante.nombre} (${visitante.depto})`);
  res.json(visitante);
});

app.post('/api/visitantes/:id/salida', (req, res) => {
  const visitante = db.visitantes.find(v => v.id === req.params.id);
  if (!visitante) return res.status(404).json({ error: 'Visitante no encontrado' });

  visitante.horaSalida = horaActual();
  visitante.estado = 'finalizado';
  addLog('visitante', `Salida: ${visitante.nombre} (${visitante.depto})`);
  res.json(visitante);
});

app.delete('/api/visitantes/:id', (req, res) => {
  const visitante = db.visitantes.find(v => v.id === req.params.id);
  if (!visitante) return res.status(404).json({ error: 'Visitante no encontrado' });

  db.visitantes = db.visitantes.filter(v => v.id !== req.params.id);
  addLog('visitante', `Registro eliminado: ${visitante.nombre} (${visitante.depto})`);
  res.status(204).send();
});

// ------------------------------------------------------------------
// BITÁCORA (solo lectura)
// ------------------------------------------------------------------
app.get('/api/bitacora', (req, res) => {
  let lista = db.bitacora;
  const { tipo } = req.query;
  if (tipo) lista = lista.filter(b => b.tipo === tipo);
  res.json(lista);
});

// ------------------------------------------------------------------
// Manejo de errores no capturados
// ------------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Se cuelgan estas dos utilidades directamente en el objeto `app` para que
// app.test.js pueda hacer: const app = require('./app'); app.resetDb();
// sin tener que importar un módulo aparte.
app.resetDb = resetDb;
app.getDb = () => db;

module.exports = app;