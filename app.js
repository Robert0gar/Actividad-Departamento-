

const DEPTOS = [];
for (let piso = 1; piso <= 5; piso++) {
  for (const letra of ['A', 'B', 'C', 'D']) {
    DEPTOS.push(`P${piso}-${letra}`);
  }
}

const TIPO_VISITA = [
  { v: 'proveedor', l: 'Proveedor' },
  { v: 'frecuente', l: 'Frecuente' },
  { v: 'unico',     l: 'Único uso' },
  { v: 'familiar',  l: 'Familiar' },
  { v: 'taxi',      l: 'Taxi' },
];

const state = {
  residentes: [],
  visitantes: [],
  bitacora: [],
};

const filters = {
  residentes: { q: '', estado: '' },
  visitantes: { q: '', tipo: '', estado: '', depto: '' },
  bitacora:   { q: '', tipo: '' },
};

//  utilidades
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nowParts() {
  const d = new Date();
  return { fecha: d.toISOString().slice(0, 10), hora: d.toTimeString().slice(0, 5) };
}
function labelTipo(v) { return (TIPO_VISITA.find(t => t.v === v) || {}).l || v; }
function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2200);
}

function addLog(tipo, descripcion) {
  const { fecha, hora } = nowParts();
  state.bitacora.unshift({ id: uid(), tipo, descripcion, fecha, hora });
}

// INICIALIZACIÓN DE SELECTS
function poblarSelectsDepto() {
  const opciones = DEPTOS.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('res-depto').innerHTML = opciones;
  document.getElementById('vis-depto').innerHTML = opciones;
  document.getElementById('vis-filtro-depto').innerHTML =
    '<option value="">Todos los deptos</option>' + opciones;
}
function poblarFiltroTipo() {
  document.getElementById('vis-filtro-tipo').innerHTML =
    '<option value="">Todos los tipos</option>' +
    TIPO_VISITA.map(t => `<option value="${t.v}">${t.l}</option>`).join('');
}
function poblarRadiosTipo() {
  document.getElementById('vis-tipo-group').innerHTML = TIPO_VISITA.map(t => `
    <label>
      <input type="radio" name="vis-tipo-radio" value="${t.v}">
      <span>${t.l}</span>
    </label>`).join('');
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// estados
function actualizarStats() {
  const hoy = nowParts().fecha;
  document.getElementById('stat-activos').textContent = state.residentes.filter(r => r.estado === 'activo').length;
  document.getElementById('stat-hoy').textContent = state.visitantes.filter(v => v.fechaEntrada === hoy).length;
  document.getElementById('stat-dentro').textContent = state.visitantes.filter(v => v.estado === 'activo').length;
  document.getElementById('stat-log').textContent = state.bitacora.length;
}

// RESIDENTES
function renderResidentes() {
  const f = filters.residentes;
  const lista = state.residentes.filter(r => {
    if (f.estado && r.estado !== f.estado) return false;
    if (f.q && !(r.nombre.toLowerCase().includes(f.q.toLowerCase()) || r.depto.toLowerCase().includes(f.q.toLowerCase()))) return false;
    return true;
  });

  const tbody = document.getElementById('tbody-residentes');
  document.getElementById('empty-residentes').style.display = lista.length ? 'none' : 'block';

  tbody.innerHTML = lista.map(r => `
    <tr>
      <td>${escapeHtml(r.nombre)}</td>
      <td><span class="depto-tag">${r.depto}</span></td>
      <td>${escapeHtml(r.telefono || '—')}</td>
      <td><span class="badge ${r.estado}">${r.estado === 'activo' ? 'Activo' : 'Baja'}</span></td>
      <td class="mono-dim">${r.fechaAlta}</td>
      <td><div class="row-actions">
        <button class="btn ghost small" data-action="editar-residente" data-id="${r.id}">Editar</button>
        <button class="btn ghost small" data-action="baja-residente" data-id="${r.id}">${r.estado === 'activo' ? 'Baja' : 'Reactivar'}</button>
        <button class="btn danger small" data-action="borrar-residente" data-id="${r.id}">Borrar</button>
      </div></td>
    </tr>`).join('');

  actualizarStats();
}

function abrirModalResidente(id) {
  const modal = document.getElementById('modal-residente');
  const esEdicion = !!id;
  const r = esEdicion ? state.residentes.find(x => x.id === id) : null;

  document.getElementById('titulo-modal-residente').textContent = esEdicion ? 'Editar residente' : 'Nuevo residente';
  document.getElementById('res-id').value = esEdicion ? r.id : '';
  document.getElementById('res-nombre').value = esEdicion ? r.nombre : '';
  document.getElementById('res-depto').value = esEdicion ? r.depto : DEPTOS[0];
  document.getElementById('res-telefono').value = esEdicion ? (r.telefono || '') : '';
  document.getElementById('res-email').value = esEdicion ? (r.email || '') : '';

  modal.style.display = 'flex';
}
function cerrarModalResidente() { document.getElementById('modal-residente').style.display = 'none'; }

document.getElementById('btn-nuevo-residente').addEventListener('click', () => abrirModalResidente(null));
document.getElementById('btn-cancelar-residente').addEventListener('click', cerrarModalResidente);
document.getElementById('modal-residente').addEventListener('click', e => { if (e.target.id === 'modal-residente') cerrarModalResidente(); });

document.getElementById('form-residente').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('res-id').value;
  const nombre = document.getElementById('res-nombre').value.trim();
  const depto = document.getElementById('res-depto').value;
  const telefono = document.getElementById('res-telefono').value.trim();
  const email = document.getElementById('res-email').value.trim();

  if (!nombre) { showToast('El nombre es obligatorio'); return; }

  if (!id) {
    state.residentes.unshift({
      id: uid(), nombre, depto, telefono, email,
      estado: 'activo', fechaAlta: nowParts().fecha,
    });
    addLog('residente', `Alta de residente ${nombre} (${depto})`);
  } else {
    const r = state.residentes.find(x => x.id === id);
    Object.assign(r, { nombre, depto, telefono, email });
    addLog('residente', `Datos actualizados: ${nombre} (${depto})`);
  }

  cerrarModalResidente();
  showToast('Residente guardado');
  renderResidentes();
  renderBitacora();
});

document.getElementById('tbody-residentes').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const r = state.residentes.find(x => x.id === id);
  if (!r) return;

  if (btn.dataset.action === 'editar-residente') abrirModalResidente(id);

  if (btn.dataset.action === 'baja-residente') {
    r.estado = r.estado === 'activo' ? 'baja' : 'activo';
    addLog('residente', `${r.estado === 'baja' ? 'Baja' : 'Reactivación'} de residente ${r.nombre} (${r.depto})`);
    showToast(r.estado === 'baja' ? 'Residente dado de baja' : 'Residente reactivado');
    renderResidentes();
    renderBitacora();
  }

  if (btn.dataset.action === 'borrar-residente') {
    if (!confirm(`¿Eliminar permanentemente a ${r.nombre}?`)) return;
    state.residentes = state.residentes.filter(x => x.id !== id);
    addLog('residente', `Registro eliminado: ${r.nombre} (${r.depto})`);
    renderResidentes();
    renderBitacora();
  }
});

document.getElementById('res-buscar').addEventListener('input', e => { filters.residentes.q = e.target.value; renderResidentes(); });
document.getElementById('res-filtro-estado').addEventListener('change', e => { filters.residentes.estado = e.target.value; renderResidentes(); });

// VISITANTES
function renderVisitantes() {
  const f = filters.visitantes;
  const lista = state.visitantes.filter(v => {
    if (f.tipo && v.tipo !== f.tipo) return false;
    if (f.estado && v.estado !== f.estado) return false;
    if (f.depto && v.depto !== f.depto) return false;
    if (f.q && !v.nombre.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  const tbody = document.getElementById('tbody-visitantes');
  document.getElementById('empty-visitantes').style.display = lista.length ? 'none' : 'block';

  tbody.innerHTML = lista.map(v => `
    <tr>
      <td>${escapeHtml(v.nombre)}</td>
      <td><span class="depto-tag">${v.depto}</span></td>
      <td><span class="badge ${v.tipo}">${labelTipo(v.tipo)}</span></td>
      <td><span class="badge ${v.estado}">${v.estado === 'activo' ? 'Dentro' : v.estado === 'borrador' ? 'Borrador' : 'Finalizado'}</span></td>
      <td class="mono-dim">${v.horaEntrada || '—'}</td>
      <td class="mono-dim">${v.horaSalida || '—'}</td>
      <td><div class="row-actions">
        <button class="btn ghost small" data-action="editar-visitante" data-id="${v.id}">Editar</button>
        ${v.estado === 'activo' ? `<button class="btn ghost small" data-action="salida-visitante" data-id="${v.id}">Salida</button>` : ''}
        <button class="btn danger small" data-action="borrar-visitante" data-id="${v.id}">Borrar</button>
      </div></td>
    </tr>`).join('');

  actualizarStats();
}

function abrirModalVisitante(id) {
  const modal = document.getElementById('modal-visitante');
  const esEdicion = !!id;
  const v = esEdicion ? state.visitantes.find(x => x.id === id) : null;

  document.getElementById('titulo-modal-visitante').textContent = esEdicion ? 'Editar visitante' : 'Nuevo visitante';
  document.getElementById('vis-id').value = esEdicion ? v.id : '';
  document.getElementById('vis-nombre').value = esEdicion ? v.nombre : '';
  document.getElementById('vis-depto').value = esEdicion ? v.depto : DEPTOS[0];
  document.getElementById('vis-estado').value = esEdicion ? v.estado : 'activo';
  document.getElementById('vis-notas').value = esEdicion ? (v.notas || '') : '';

  const tipoElegido = esEdicion ? v.tipo : 'unico';
  document.querySelectorAll('input[name="vis-tipo-radio"]').forEach(r => { r.checked = (r.value === tipoElegido); });

  modal.style.display = 'flex';
}
function cerrarModalVisitante() { document.getElementById('modal-visitante').style.display = 'none'; }

document.getElementById('btn-nuevo-visitante').addEventListener('click', () => abrirModalVisitante(null));
document.getElementById('btn-cancelar-visitante').addEventListener('click', cerrarModalVisitante);
document.getElementById('modal-visitante').addEventListener('click', e => { if (e.target.id === 'modal-visitante') cerrarModalVisitante(); });

document.getElementById('form-visitante').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('vis-id').value;
  const nombre = document.getElementById('vis-nombre').value.trim();
  const depto = document.getElementById('vis-depto').value;
  const estado = document.getElementById('vis-estado').value;
  const notas = document.getElementById('vis-notas').value.trim();
  const tipoRadio = document.querySelector('input[name="vis-tipo-radio"]:checked');
  const tipo = tipoRadio ? tipoRadio.value : 'unico';

  if (!nombre) { showToast('El nombre es obligatorio'); return; }

  if (!id) {
    const { fecha, hora } = nowParts();
    state.visitantes.unshift({
      id: uid(), nombre, depto, tipo, estado, notas,
      fechaEntrada: fecha, horaEntrada: hora, horaSalida: null,
    });
    addLog('visitante', `Entrada: ${nombre} → ${depto} (${labelTipo(tipo)})`);
  } else {
    const v = state.visitantes.find(x => x.id === id);
    Object.assign(v, { nombre, depto, tipo, estado, notas });
    addLog('visitante', `Registro actualizado: ${nombre} (${depto})`);
  }

  cerrarModalVisitante();
  showToast('Visitante guardado');
  renderVisitantes();
  renderBitacora();
});

document.getElementById('tbody-visitantes').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const v = state.visitantes.find(x => x.id === id);
  if (!v) return;

  if (btn.dataset.action === 'editar-visitante') abrirModalVisitante(id);

  if (btn.dataset.action === 'salida-visitante') {
    v.horaSalida = nowParts().hora;
    v.estado = 'finalizado';
    addLog('visitante', `Salida: ${v.nombre} (${v.depto})`);
    showToast('Salida registrada');
    renderVisitantes();
    renderBitacora();
  }

  if (btn.dataset.action === 'borrar-visitante') {
    if (!confirm(`¿Eliminar el registro de ${v.nombre}?`)) return;
    state.visitantes = state.visitantes.filter(x => x.id !== id);
    addLog('visitante', `Registro eliminado: ${v.nombre} (${v.depto})`);
    renderVisitantes();
    renderBitacora();
  }
});

document.getElementById('vis-buscar').addEventListener('input', e => { filters.visitantes.q = e.target.value; renderVisitantes(); });
document.getElementById('vis-filtro-tipo').addEventListener('change', e => { filters.visitantes.tipo = e.target.value; renderVisitantes(); });
document.getElementById('vis-filtro-estado').addEventListener('change', e => { filters.visitantes.estado = e.target.value; renderVisitantes(); });
document.getElementById('vis-filtro-depto').addEventListener('change', e => { filters.visitantes.depto = e.target.value; renderVisitantes(); });

