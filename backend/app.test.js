
const request = require('supertest');
const app = require('./app');

beforeEach(() => app.resetDb());

// ============================================================
// ✅ PRUEBAS EXITOSAS — el CRUD debe comportarse así cuando todo está bien
// ============================================================
describe('CRUD Residentes — casos exitosos', () => {

  test('CREATE: crea un residente con datos válidos (201)', async () => {
    const res = await request(app)
      .post('/api/residentes')
      .send({ nombre: 'Melissa Torres', depto: 'P1-A', telefono: '555-0101' });

    expect(res.status).toBe(201);
    expect(res.body.nombre).toBe('Melissa Torres');
    expect(res.body.estado).toBe('activo');
    expect(res.body.id).toBeDefined();
  });

  test('READ: lista los residentes creados (200)', async () => {
    await request(app).post('/api/residentes').send({ nombre: 'Ricardo Gómez', depto: 'P1-A' });
    await request(app).post('/api/residentes').send({ nombre: 'Roberto Nava', depto: 'P1-A' });

    const res = await request(app).get('/api/residentes');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  test('UPDATE: edita el nombre y el teléfono de un residente (200)', async () => {
    const creado = await request(app).post('/api/residentes').send({ nombre: 'Ana Ruiz', depto: 'P2-B' });

    const res = await request(app)
      .put(`/api/residentes/${creado.body.id}`)
      .send({ nombre: 'Ana Ruiz Actualizada', telefono: '555-9999' });

    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Ana Ruiz Actualizada');
    expect(res.body.telefono).toBe('555-9999');
  });

  test('BAJA: alterna el estado activo → baja → activo (200)', async () => {
    const creado = await request(app).post('/api/residentes').send({ nombre: 'Luis Ortiz', depto: 'P3-C' });

    const baja = await request(app).patch(`/api/residentes/${creado.body.id}/baja`);
    expect(baja.status).toBe(200);
    expect(baja.body.estado).toBe('baja');

    const reactivado = await request(app).patch(`/api/residentes/${creado.body.id}/baja`);
    expect(reactivado.body.estado).toBe('activo');
  });

  test('DELETE: elimina un residente existente (204)', async () => {
    const creado = await request(app).post('/api/residentes').send({ nombre: 'Sofía Reyes', depto: 'P4-D' });

    const res = await request(app).delete(`/api/residentes/${creado.body.id}`);
    expect(res.status).toBe(204);

    const lista = await request(app).get('/api/residentes');
    expect(lista.body.length).toBe(0);
  });

});

// ============================================================
// ❌ PRUEBAS FALLIDAS — el CRUD debe RECHAZAR estos casos (esperamos error)
// ============================================================
describe('CRUD Residentes — casos que deben fallar', () => {

  test('CREATE: rechaza si falta el nombre (400)', async () => {
    const res = await request(app).post('/api/residentes').send({ depto: 'P1-A' });
    expect(res.status).toBe(400);
  });

  test('CREATE: rechaza un depto con formato inválido (400)', async () => {
    const res = await request(app)
      .post('/api/residentes')
      .send({ nombre: 'Juan Pérez', depto: 'departamento-x' });
    expect(res.status).toBe(400);
  });

  test('CREATE: rechaza si falta el depto (400)', async () => {
    const res = await request(app).post('/api/residentes').send({ nombre: 'Sin Depto' });
    expect(res.status).toBe(400);
  });

  test('UPDATE: rechaza si el residente no existe (404)', async () => {
    const res = await request(app)
      .put('/api/residentes/id-que-no-existe')
      .send({ nombre: 'Alguien' });
    expect(res.status).toBe(404);
  });

  test('UPDATE: rechaza si se intenta dejar el nombre vacío (400)', async () => {
    const creado = await request(app).post('/api/residentes').send({ nombre: 'Carlos Vega', depto: 'P5-A' });
    const res = await request(app)
      .put(`/api/residentes/${creado.body.id}`)
      .send({ nombre: '   ' });
    expect(res.status).toBe(400);
  });

  test('BAJA: rechaza si el residente no existe (404)', async () => {
    const res = await request(app).patch('/api/residentes/id-que-no-existe/baja');
    expect(res.status).toBe(404);
  });

  test('DELETE: rechaza si el residente no existe (404)', async () => {
    const res = await request(app).delete('/api/residentes/id-que-no-existe');
    expect(res.status).toBe(404);
  });

});