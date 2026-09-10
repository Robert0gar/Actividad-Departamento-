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

// ---------- utilidades ----------
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

// ============================================================
// DATOS DE EJEMPLO (para ver el caso: un depto con varios residentes)
// ============================================================
function sembrarEjemplo() {
  const hoy = nowParts().fecha;
  state.residentes.push(
    { id: uid(), nombre: 'Melissa Torres', depto: 'P1-A', telefono: '555-0101', email: '', estado: 'activo', fechaAlta: hoy },
    { id: uid(), nombre: 'Ricardo Gómez',  depto: 'P1-A', telefono: '555-0102', email: '', estado: 'activo', fechaAlta: hoy },
    { id: uid(), nombre: 'Roberto Nava',   depto: 'P1-A', telefono: '555-0103', email: '', estado: 'activo', fechaAlta: hoy },
  );
}

// ============================================================
// INICIALIZACIÓN DE SELECTS Y RADIOS
// ============================================================
function poblarSelectDeptoResidente() {
  const opciones = DEPTOS.map(d => `<option value="${d}">${d}</option>`).join('');
  document.getElementById('res-depto').innerHTML = opciones;
}
function poblarFiltrosVisitantes() {
  document.getElementById('vis-filtro-tipo').innerHTML =
    '<option value="">Todos los tipos</option>' +
    TIPO_VISITA.map(t => `<option value="${t.v}">${t.l}</option>`).join('');
  document.getElementById('vis-filtro-depto').innerHTML =
    '<option value="">Todos los deptos</option>' +
    DEPTOS.map(d => `<option value="${d}">${d}</option>`).join('');
}
function poblarSelectDeptoVisitante() {
  // Solo se muestran deptos que ya tienen al menos un residente activo
  const deptosConResidentes = [...new Set(
    state.residentes.filter(r => r.estado === 'activo').map(r => r.depto)
  )].sort();
  document.getElementById('vis-depto').innerHTML = deptosConResidentes.length
    ? deptosConResidentes.map(d => `<option value="${d}">${d}</option>`).join('')
    : '<option value="">Sin residentes dados de alta</option>';
}
function poblarSelectResidentePorDepto(depto, residenteIdSeleccionado) {
  const disponibles = state.residentes.filter(r => r.depto === depto && r.estado === 'activo');
  const select = document.getElementById('vis-residente');
  select.innerHTML = disponibles.length
    ? disponibles.map(r => `<option value="${r.id}">${escapeHtml(r.nombre)}</option>`).join('')
    : '<option value="">Sin residentes activos en este depto</option>';
  if (residenteIdSeleccionado) select.value = residenteIdSeleccionado;
}
function poblarRadiosTipo() {
  document.getElementById('vis-tipo-group').innerHTML = TIPO_VISITA.map(t => `
    <label>
      <input type="radio" name="vis-tipo-radio" value="${t.v}">
      <span>${t.l}</span>
    </label>`).join('');
}

// ============================================================
// TABS
// ============================================================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================================
// STATS
// ============================================================
function actualizarStats() {
  const hoy = nowParts().fecha;
  document.getElementById('stat-activos').textContent = state.residentes.filter(r => r.estado === 'activo').length;
  document.getElementById('stat-hoy').textContent = state.visitantes.filter(v => v.fecha === hoy).length;
  document.getElementById('stat-dentro').textContent = state.visitantes.filter(v => v.estado === 'activo').length;
  document.getElementById('stat-log').textContent = state.bitacora.length;
}

// ============================================================
// RESIDENTES
// ============================================================
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
        <button class="btn ghost small" data-action="visitas-residente" data-id="${r.id}">Visitas</button>
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
  poblarSelectDeptoVisitante();
});

document.getElementById('tbody-residentes').addEventListener('click', e => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id = btn.dataset.id;
  const r = state.residentes.find(x => x.id === id);
  if (!r) return;

  if (btn.dataset.action === 'editar-residente') abrirModalResidente(id);

  if (btn.dataset.action === 'visitas-residente') abrirModalVisitasResidente(id);

  if (btn.dataset.action === 'baja-residente') {
    r.estado = r.estado === 'activo' ? 'baja' : 'activo';
    addLog('residente', `${r.estado === 'baja' ? 'Baja' : 'Reactivación'} de residente ${r.nombre} (${r.depto})`);
    showToast(r.estado === 'baja' ? 'Residente dado de baja' : 'Residente reactivado');
    renderResidentes();
    renderBitacora();
    poblarSelectDeptoVisitante();
  }

  if (btn.dataset.action === 'borrar-residente') {
    if (!confirm(`¿Eliminar permanentemente a ${r.nombre}?`)) return;
    state.residentes = state.residentes.filter(x => x.id !== id);
    addLog('residente', `Registro eliminado: ${r.nombre} (${r.depto})`);
    renderResidentes();
    renderBitacora();
    poblarSelectDeptoVisitante();
  }
});

document.getElementById('res-buscar').addEventListener('input', e => { filters.residentes.q = e.target.value; renderResidentes(); });
document.getElementById('res-filtro-estado').addEventListener('change', e => { filters.residentes.estado = e.target.value; renderResidentes(); });

// ---------- historial de visitas por residente ----------
function abrirModalVisitasResidente(residenteId) {
  const r = state.residentes.find(x => x.id === residenteId);
  if (!r) return;
  document.getElementById('titulo-modal-visitas').textContent = `Visitas de ${r.nombre}`;

  const visitas = state.visitantes
    .filter(v => v.residenteId === residenteId)
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const tbody = document.getElementById('tbody-visitas-residente');
  document.getElementById('empty-visitas-residente').style.display = visitas.length ? 'none' : 'block';
  tbody.innerHTML = visitas.map(v => `
    <tr>
      <td>${escapeHtml(v.nombre)} <span class="badge ${v.tipo}" style="margin-left:6px;">${labelTipo(v.tipo)}</span></td>
      <td class="mono-dim">${v.fecha}</td>
    </tr>`).join('');

  document.getElementById('modal-visitas-residente').style.display = 'flex';
}
document.getElementById('btn-cerrar-visitas-residente').addEventListener('click', () => {
  document.getElementById('modal-visitas-residente').style.display = 'none';
});
document.getElementById('modal-visitas-residente').addEventListener('click', e => {
  if (e.target.id === 'modal-visitas-residente') e.target.style.display = 'none';
});

// ============================================================
// VISITANTES
// ============================================================
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

  tbody.innerHTML = lista.map(v => {
    const residente = state.residentes.find(r => r.id === v.residenteId);
    return `
    <tr>
      <td>${escapeHtml(v.nombre)}</td>
      <td><span class="depto-tag">${v.depto}</span></td>
      <td>${escapeHtml(residente ? residente.nombre : '—')}</td>
      <td><span class="badge ${v.tipo}">${labelTipo(v.tipo)}</span></td>
      <td class="mono-dim">${v.fecha}</td>
      <td><span class="badge ${v.estado}">${v.estado === 'activo' ? 'Dentro' : 'Finalizado'}</span></td>
      <td><div class="row-actions">
        <button class="btn ghost small" data-action="editar-visitante" data-id="${v.id}">Editar</button>
        ${v.estado === 'activo' ? `<button class="btn ghost small" data-action="salida-visitante" data-id="${v.id}">Salida</button>` : ''}
        <button class="btn danger small" data-action="borrar-visitante" data-id="${v.id}">Borrar</button>
      </div></td>
    </tr>`;
  }).join('');

  actualizarStats();
}

function abrirModalVisitante(id) {
  const modal = document.getElementById('modal-visitante');
  const esEdicion = !!id;
  const v = esEdicion ? state.visitantes.find(x => x.id === id) : null;

  document.getElementById('titulo-modal-visitante').textContent = esEdicion ? 'Editar visitante' : 'Nuevo visitante';
  document.getElementById('vis-id').value = esEdicion ? v.id : '';
  document.getElementById('vis-nombre').value = esEdicion ? v.nombre : '';
  document.getElementById('vis-fecha').value = esEdicion ? v.fecha : nowParts().fecha;

  poblarSelectDeptoVisitante();
  const depto = esEdicion ? v.depto : document.getElementById('vis-depto').value;
  document.getElementById('vis-depto').value = depto;
  poblarSelectResidentePorDepto(depto, esEdicion ? v.residenteId : null);

  const tipoElegido = esEdicion ? v.tipo : 'unico';
  document.querySelectorAll('input[name="vis-tipo-radio"]').forEach(r => { r.checked = (r.value === tipoElegido); });

  modal.style.display = 'flex';
}
function cerrarModalVisitante() { document.getElementById('modal-visitante').style.display = 'none'; }

document.getElementById('btn-nuevo-visitante').addEventListener('click', () => {
  if (state.residentes.filter(r => r.estado === 'activo').length === 0) {
    showToast('Primero da de alta al menos un residente');
    return;
  }
  abrirModalVisitante(null);
});
document.getElementById('btn-cancelar-visitante').addEventListener('click', cerrarModalVisitante);
document.getElementById('modal-visitante').addEventListener('click', e => { if (e.target.id === 'modal-visitante') cerrarModalVisitante(); });

// al cambiar el depto dentro del modal, se recalcula la lista de residentes
document.getElementById('vis-depto').addEventListener('change', e => {
  poblarSelectResidentePorDepto(e.target.value, null);
});

document.getElementById('form-visitante').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('vis-id').value;
  const nombre = document.getElementById('vis-nombre').value.trim();
  const depto = document.getElementById('vis-depto').value;
  const residenteId = document.getElementById('vis-residente').value;
  const fecha = document.getElementById('vis-fecha').value;
  const tipoRadio = document.querySelector('input[name="vis-tipo-radio"]:checked');
  const tipo = tipoRadio ? tipoRadio.value : 'unico';
  const residente = state.residentes.find(r => r.id === residenteId);

  if (!nombre) { showToast('El nombre del visitante es obligatorio'); return; }
  if (!residente) { showToast('Selecciona un residente válido'); return; }
  if (!fecha) { showToast('La fecha es obligatoria'); return; }

  if (!id) {
    state.visitantes.unshift({
      id: uid(), nombre, depto, residenteId, tipo, fecha,
      estado: 'activo', horaEntrada: nowParts().hora, horaSalida: null,
    });
    addLog('visitante', `Registro: ${nombre} visita a ${residente.nombre} (${depto}) — ${labelTipo(tipo)}`);
  } else {
    const v = state.visitantes.find(x => x.id === id);
    Object.assign(v, { nombre, depto, residenteId, tipo, fecha });
    addLog('visitante', `Registro actualizado: ${nombre} (${depto})`);
  }

  cerrarModalVisitante();
  showToast('Visitante registrado');
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

// ============================================================
// BITÁCORA
// ============================================================
function renderBitacora() {
  const f = filters.bitacora;
  const lista = state.bitacora.filter(b => {
    if (f.tipo && b.tipo !== f.tipo) return false;
    if (f.q && !b.descripcion.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  });

  const tbody = document.getElementById('tbody-bitacora');
  document.getElementById('empty-bitacora').style.display = lista.length ? 'none' : 'block';

  tbody.innerHTML = lista.map(b => `
    <tr>
      <td class="mono-dim">${b.fecha}</td>
      <td class="mono-dim">${b.hora}</td>
      <td><span class="badge ${b.tipo === 'residente' ? 'familiar' : 'unico'}">${b.tipo === 'residente' ? 'Residente' : 'Visitante'}</span></td>
      <td>${escapeHtml(b.descripcion)}</td>
    </tr>`).join('');

  actualizarStats();
}

document.getElementById('log-buscar').addEventListener('input', e => { filters.bitacora.q = e.target.value; renderBitacora(); });
document.getElementById('log-filtro-tipo').addEventListener('change', e => { filters.bitacora.tipo = e.target.value; renderBitacora(); });

// ============================================================
// ARRANQUE
// ============================================================
sembrarEjemplo();
poblarSelectDeptoResidente();
poblarFiltrosVisitantes();
poblarRadiosTipo();
renderResidentes();
renderVisitantes();
renderBitacora();
