const DB = {
  get estudiantes()    { return JSON.parse(localStorage.getItem('lc_est')  || '[]'); },
  set estudiantes(v)   { localStorage.setItem('lc_est',  JSON.stringify(v)); },
  get programas()      { return JSON.parse(localStorage.getItem('lc_prog') || '[]'); },
  set programas(v)     { localStorage.setItem('lc_prog', JSON.stringify(v)); },
  get inscripciones()  { return JSON.parse(localStorage.getItem('lc_ins')  || '[]'); },
  set inscripciones(v) { localStorage.setItem('lc_ins',  JSON.stringify(v)); },
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }

// ── NAVEGACIÓN 
function ir(pagina) {
  document.getElementById('page-home').style.display = 'none';
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

  if (pagina === 'home') {
    document.getElementById('page-home').style.display = 'flex';
  } else {
    document.getElementById('page-' + pagina).classList.add('active');
  }

  const nl = document.getElementById('nl-' + pagina);
  if (nl) nl.classList.add('active');

  if (pagina === 'estudiantes')   renderEst();
  if (pagina === 'programas')     renderProg();
  if (pagina === 'inscripciones') renderIns();
  if (pagina === 'historial')     { poblarSel('sel-hist', DB.estudiantes); renderHistorial(); }
}

// ── TOAST ──────────────────────────────
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (err ? ' err' : '');
  setTimeout(() => t.className = 'toast', 3200);
}

// ── MODALES ────────────────────────────
function abrirModal(id) {
  if (id === 'm-est') poblarSelect('e-prog', DB.programas, p => `${p.nombre} (${p.codigo})`);
  if (id === 'm-ins') poblarSel('i-est', DB.estudiantes);
  document.getElementById(id).classList.add('open');
}

function cerrarModal(id) {
  document.getElementById(id).classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o =>
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); })
);

// ══════════════════════════════════════
//  ESTUDIANTES
// ══════════════════════════════════════
function guardarEstudiante() {
  const nom = v('e-nom'), ape = v('e-ape'), ced = v('e-ced'), sem = v('e-sem');
  if (!nom || !ape || !ced || !sem) { toast('Completa los campos obligatorios (*)', true); return; }

  const lista = DB.estudiantes;
  if (lista.find(e => e.cedula === ced)) { toast('Cédula ya registrada', true); return; }

  lista.push({
    id: uid(), nombre: nom, apellido: ape, cedula: ced,
    semestre: sem, email: v('e-mail'), telefono: v('e-tel'),
    programa: v('e-prog'), fecha: hoy()
  });
  DB.estudiantes = lista;
  toast(`✓ ${nom} ${ape} registrado`);
  cerrarModal('m-est');
  limpiar(['e-nom', 'e-ape', 'e-ced', 'e-mail', 'e-tel']);
  renderEst();
}

function renderEst() {
  const q = (document.getElementById('q-est')?.value || '').toLowerCase();
  const lista = DB.estudiantes.filter(e =>
    `${e.nombre} ${e.apellido} ${e.cedula}`.toLowerCase().includes(q)
  );
  const g = document.getElementById('grid-est');
  if (!lista.length) { g.innerHTML = '<div class="empty">No hay estudiantes registrados</div>'; return; }

  g.innerHTML = lista.map(e => {
    const prog = DB.programas.find(p => p.id === e.programa);
    const ins  = DB.inscripciones.filter(i => i.estudianteId === e.id).length;
    return `
    <div class="card">
      <div class="card-head">
        <div class="card-name">${e.nombre} ${e.apellido}</div>
        <div class="card-badge">Sem. ${e.semestre}</div>
      </div>
      <div class="card-row">Cédula: <span>${e.cedula}</span></div>
      <div class="card-row">Programa: <span>${prog ? prog.nombre : '—'}</span></div>
      <div class="card-row">Correo: <span>${e.email || '—'}</span></div>
      <div class="card-row">Asignaturas inscritas: <span>${ins}</span></div>
      <div class="card-actions">
        <button class="btn-sm" onclick="irHistorial('${e.id}')">Ver historial</button>
        <button class="btn-sm" onclick="inscribirA('${e.id}')">Inscribir</button>
        <button class="btn-sm del" onclick="elimEst('${e.id}')">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function elimEst(id) {
  if (!confirm('¿Eliminar este estudiante?')) return;
  DB.estudiantes   = DB.estudiantes.filter(e => e.id !== id);
  DB.inscripciones = DB.inscripciones.filter(i => i.estudianteId !== id);
  toast('Estudiante eliminado');
  renderEst();
}

// ══════════════════════════════════════
//  PROGRAMAS
// ══════════════════════════════════════
function guardarPrograma() {
  const nom = v('p-nom');
  if (!nom) { toast('El nombre es obligatorio', true); return; }

  const cod = 'PROG-' + Date.now().toString(36).toUpperCase(); // código automático

  const lista = DB.programas;
  lista.push({
    id: uid(), nombre: nom, codigo: cod,
    duracion: v('p-dur'),
    asignaturas: v('p-asi').split(',').map(a => a.trim()).filter(Boolean),
    cupoMax: parseInt(v('p-cup')) || 30,
    fecha: hoy()
  });
  DB.programas = lista;
  cerrarModal('m-prog');
  limpiar(['p-nom', 'p-dur', 'p-asi', 'p-cup']);
  renderProg();
  toast(`✓ Programa "${nom}" creado`);
}

function renderProg() {
  const q = (document.getElementById('q-prog')?.value || '').toLowerCase();
  const lista = DB.programas.filter(p =>
    `${p.nombre} ${p.codigo} ${p.facultad}`.toLowerCase().includes(q)
  );
  const g = document.getElementById('grid-prog');
  if (!lista.length) { g.innerHTML = '<div class="empty">No hay programas académicos registrados</div>'; return; }

  g.innerHTML = lista.map(p => {
    const ests = DB.estudiantes.filter(e => e.programa === p.id).length;
    return `
    <div class="card">
      <div class="card-head">
        <div class="card-name">${p.nombre}</div>
        <div class="card-badge">${p.codigo}</div>
      </div>
      <div class="card-row">Facultad: <span>${p.facultad || '—'}</span></div>
      <div class="card-row">Duración: <span>${p.duracion || '—'} semestres</span></div>
      <div class="card-row">Estudiantes matriculados: <span>${ests}</span></div>
      <div class="card-row">Cupo/asignatura: <span>${p.cupoMax}</span></div>
      <div style="margin-top:10px">
        ${(p.asignaturas || []).slice(0, 3).map(a => `<span class="tag">${a}</span>`).join('')}
        ${p.asignaturas?.length > 3 ? `<span style="color:var(--green);font-size:0.75rem"> +${p.asignaturas.length - 3} más</span>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn-sm" onclick="verProg('${p.id}')">Ver detalle</button>
        <button class="btn-sm del" onclick="elimProg('${p.id}')">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function elimProg(id) {
  if (!confirm('¿Eliminar este programa?')) return;
  DB.programas = DB.programas.filter(p => p.id !== id);
  toast('Programa eliminado');
  renderProg();
}

function verProg(id) {
  const p    = DB.programas.find(x => x.id === id);
  const ests = DB.estudiantes.filter(e => e.programa === id);
  alert(`${p.nombre} (${p.codigo})\nFacultad: ${p.facultad || '—'}\nDuración: ${p.duracion} sem\nCupo: ${p.cupoMax}\nEstudiantes: ${ests.length}\n\nAsignaturas:\n${(p.asignaturas || []).join(', ')}`);
}

// ══════════════════════════════════════
//  INSCRIPCIONES
// ══════════════════════════════════════
function cargarAsignaturas() {
  const estId = v('i-est');
  const sel   = document.getElementById('i-asi');
  sel.innerHTML = '<option value="">— Seleccionar —</option>';
  if (!estId) return;

  const est  = DB.estudiantes.find(e => e.id === estId);
  const prog = DB.programas.find(p => p.id === est?.programa);
  if (!prog) { sel.innerHTML = '<option>Estudiante sin programa asignado</option>'; return; }

  const inscritas = DB.inscripciones.filter(i => i.estudianteId === estId).map(i => i.asignatura);
  (prog.asignaturas || []).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a;
    const yaInscrita = inscritas.includes(a);
    opt.textContent = yaInscrita ? `${a} (ya inscrita)` : a;
    if (yaInscrita) opt.disabled = true;
    sel.appendChild(opt);
  });
}

function guardarInscripcion() {
  const estId = v('i-est'), sem = v('i-sem'), asi = v('i-asi'), nota = v('i-not');
  if (!estId || !sem || !asi) { toast('Completa todos los campos obligatorios', true); return; }

  const est  = DB.estudiantes.find(e => e.id === estId);
  const prog = DB.programas.find(p => p.id === est?.programa);

  // Control de cupo
  if (prog) {
    const ocupados = DB.inscripciones.filter(i => i.asignatura === asi && i.semestre === sem).length;
    if (ocupados >= prog.cupoMax) { toast('⚠ Cupo lleno para esta asignatura', true); return; }
  }

  const notaNum = nota ? parseFloat(nota) : null;
  const lista   = DB.inscripciones;
  lista.push({
    id: uid(), estudianteId: estId,
    nombreEst: `${est.nombre} ${est.apellido}`,
    asignatura: asi, semestre: sem,
    nota: notaNum,
    estado: notaNum !== null ? (notaNum >= 3.0 ? 'Aprobada' : 'Reprobada') : 'En curso',
    fecha: hoy()
  });
  DB.inscripciones = lista;
  toast(`✓ ${asi} inscrita para ${est.nombre}`);
  cerrarModal('m-ins');
  document.getElementById('i-not').value = '';
  renderIns();
}

function renderIns() {
  const q = (document.getElementById('q-ins')?.value || '').toLowerCase();
  const lista = DB.inscripciones.filter(i =>
    `${i.nombreEst} ${i.asignatura}`.toLowerCase().includes(q)
  );
  const g = document.getElementById('grid-ins');
  if (!lista.length) { g.innerHTML = '<div class="empty">No hay inscripciones registradas</div>'; return; }

  g.innerHTML = lista.map(i => {
    const est     = DB.estudiantes.find(e => e.id === i.estudianteId);
    const prog    = DB.programas.find(p => p.id === est?.programa);
    const cupoMax = prog?.cupoMax || 30;
    const ocupados = DB.inscripciones.filter(x => x.asignatura === i.asignatura && x.semestre === i.semestre).length;
    const pct = Math.round((ocupados / cupoMax) * 100);
    const fc  = pct >= 100 ? 'full' : pct >= 75 ? 'warn' : '';
    const bc  = i.estado === 'Aprobada' ? 'bg' : i.estado === 'Reprobada' ? 'br' : 'bw';

    return `
    <div class="card">
      <div class="card-head">
        <div class="card-name">${i.asignatura}</div>
        <span class="badge ${bc}">${i.estado}</span>
      </div>
      <div class="card-row">Estudiante: <span>${i.nombreEst}</span></div>
      <div class="card-row">Semestre: <span>${i.semestre}</span></div>
      <div class="card-row">Nota: <span>${i.nota ?? '—'}</span></div>
      <div class="card-row">Fecha: <span>${i.fecha}</span></div>
      <div class="cupo-bar">
        <div class="cupo-labels"><span>Cupo disponible</span><span>${ocupados}/${cupoMax}</span></div>
        <div class="cupo-track"><div class="cupo-fill ${fc}" style="width:${Math.min(pct, 100)}%"></div></div>
      </div>
      <div class="card-actions">
        <button class="btn-sm" onclick="editarNota('${i.id}')">Editar nota</button>
        <button class="btn-sm del" onclick="elimIns('${i.id}')">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function editarNota(id) {
  const nota = prompt('Nueva nota (0.0 – 5.0):');
  if (nota === null) return;
  const n = parseFloat(nota);
  if (isNaN(n) || n < 0 || n > 5) { toast('Nota inválida', true); return; }
  const lista = DB.inscripciones;
  const i = lista.find(x => x.id === id);
  if (i) { i.nota = n; i.estado = n >= 3.0 ? 'Aprobada' : 'Reprobada'; }
  DB.inscripciones = lista;
  toast('✓ Nota actualizada');
  renderIns();
}

function elimIns(id) {
  if (!confirm('¿Eliminar inscripción?')) return;
  DB.inscripciones = DB.inscripciones.filter(i => i.id !== id);
  toast('Inscripción eliminada');
  renderIns();
}

// ══════════════════════════════════════
//  HISTORIAL
// ══════════════════════════════════════
function renderHistorial() {
  const id   = document.getElementById('sel-hist')?.value;
  const cont = document.getElementById('hist-contenido');
  if (!id) { cont.innerHTML = '<div class="empty">Selecciona un estudiante para ver su historial</div>'; return; }

  const ins = DB.inscripciones.filter(i => i.estudianteId === id);
  if (!ins.length) { cont.innerHTML = '<div class="empty">Este estudiante no tiene asignaturas inscritas</div>'; return; }

  const notas    = ins.filter(i => i.nota !== null).map(i => i.nota);
  const promedio = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : '—';
  const aprobadas  = ins.filter(i => i.estado === 'Aprobada').length;
  const reprobadas = ins.filter(i => i.estado === 'Reprobada').length;
  const enCurso    = ins.filter(i => i.estado === 'En curso').length;

  cont.innerHTML = `
    <div class="stats-row">
      <div class="stat-box"><div class="stat-num" style="color:var(--green)">${promedio}</div><div class="stat-lbl">Promedio</div></div>
      <div class="stat-box"><div class="stat-num" style="color:var(--green)">${aprobadas}</div><div class="stat-lbl">Aprobadas</div></div>
      <div class="stat-box"><div class="stat-num" style="color:var(--danger)">${reprobadas}</div><div class="stat-lbl">Reprobadas</div></div>
      <div class="stat-box"><div class="stat-num" style="color:var(--warning)">${enCurso}</div><div class="stat-lbl">En curso</div></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Asignatura</th><th>Semestre</th><th>Nota</th><th>Estado</th><th>Fecha</th></tr></thead>
        <tbody>
          ${ins.map(i => {
            const bc = i.estado === 'Aprobada' ? 'bg' : i.estado === 'Reprobada' ? 'br' : 'bw';
            return `<tr>
              <td>${i.asignatura}</td>
              <td>${i.semestre}</td>
              <td>${i.nota ?? '—'}</td>
              <td><span class="badge ${bc}">${i.estado}</span></td>
              <td>${i.fecha}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

// ══════════════════════════════════════
//  EXPORTAR A EXCEL
// ══════════════════════════════════════
function exportarExcel() {
  const ins   = DB.inscripciones;
  const ests  = DB.estudiantes;
  const progs = DB.programas;

  if (!ins.length) { toast('No hay inscripciones para exportar', true); return; }

  // Hoja 1: Inscripciones detalladas
  const datosIns = ins.map(i => {
    const est  = ests.find(e => e.id === i.estudianteId);
    const prog = progs.find(p => p.id === est?.programa);
    return {
      'Nombre':            est ? `${est.nombre} ${est.apellido}` : '—',
      'Cédula':            est?.cedula || '—',
      'Programa':          prog?.nombre || '—',
      'Semestre':          i.semestre,
      'Asignatura':        i.asignatura,
      'Nota':              i.nota ?? '—',
      'Estado':            i.estado,
      'Fecha inscripción': i.fecha,
    };
  });

  // Hoja 2: Resumen por estudiante
  const resumen = ests.map(e => {
    const mis   = ins.filter(i => i.estudianteId === e.id);
    const notas = mis.filter(i => i.nota !== null).map(i => i.nota);
    const prog  = progs.find(p => p.id === e.programa);
    return {
      'Nombre':          `${e.nombre} ${e.apellido}`,
      'Cédula':          e.cedula,
      'Programa':        prog?.nombre || '—',
      'Semestre':        e.semestre,
      'Total inscritas': mis.length,
      'Aprobadas':       mis.filter(i => i.estado === 'Aprobada').length,
      'Reprobadas':      mis.filter(i => i.estado === 'Reprobada').length,
      'En curso':        mis.filter(i => i.estado === 'En curso').length,
      'Promedio':        notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : '—',
    };
  });

  // Hoja 3: Control de cupos
  const cuposMap = {};
  ins.forEach(i => {
    const key = `${i.asignatura}||${i.semestre}`;
    if (!cuposMap[key]) {
      const est  = ests.find(e => e.id === i.estudianteId);
      const prog = progs.find(p => p.id === est?.programa);
      cuposMap[key] = { asignatura: i.asignatura, semestre: i.semestre, inscritos: 0, cupoMax: prog?.cupoMax || 30 };
    }
    cuposMap[key].inscritos++;
  });

  const cupos = Object.values(cuposMap).map(c => ({
    'Asignatura':  c.asignatura,
    'Semestre':    c.semestre,
    'Inscritos':   c.inscritos,
    'Cupo máximo': c.cupoMax,
    'Disponibles': c.cupoMax - c.inscritos,
    'Estado cupo': c.inscritos >= c.cupoMax ? 'LLENO' : c.inscritos >= c.cupoMax * 0.75 ? 'CASI LLENO' : 'DISPONIBLE',
  }));

  const wb  = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(datosIns);
  const ws2 = XLSX.utils.json_to_sheet(resumen);
  const ws3 = XLSX.utils.json_to_sheet(cupos);
  ws1['!cols'] = [20, 15, 25, 10, 25, 8, 12, 18].map(w => ({ wch: w }));
  ws2['!cols'] = [22, 14, 25, 10, 14, 12, 12, 10, 10].map(w => ({ wch: w }));
  ws3['!cols'] = [25, 10, 10, 14, 12, 16].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws1, 'Inscripciones');
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen Estudiantes');
  XLSX.utils.book_append_sheet(wb, ws3, 'Control de Cupos');

  const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
  XLSX.writeFile(wb, `LearnChoice_Inscripciones_${fecha}.xlsx`);
  toast('✓ Excel descargado correctamente');
}

function exportarHistorialExcel() {
  const id = document.getElementById('sel-hist')?.value;
  if (!id) { toast('Selecciona un estudiante primero', true); return; }

  const est  = DB.estudiantes.find(e => e.id === id);
  const ins  = DB.inscripciones.filter(i => i.estudianteId === id);
  if (!ins.length) { toast('Este estudiante no tiene inscripciones', true); return; }

  const notas = ins.filter(i => i.nota !== null).map(i => i.nota);
  const prom  = notas.length ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2) : '—';

  const datos = ins.map(i => ({
    'Asignatura': i.asignatura,
    'Semestre':   i.semestre,
    'Nota':       i.nota ?? '—',
    'Estado':     i.estado,
    'Fecha':      i.fecha,
  }));

  datos.push({});
  datos.push({
    'Asignatura': 'RESUMEN',
    'Semestre':   `Total: ${ins.length}`,
    'Nota':       `Promedio: ${prom}`,
    'Estado':     `Aprobadas: ${ins.filter(i => i.estado === 'Aprobada').length} | Reprobadas: ${ins.filter(i => i.estado === 'Reprobada').length}`,
    'Fecha':      '',
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [28, 10, 8, 14, 14].map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');

  const nombre = `${est.nombre}_${est.apellido}`.replace(/ /g, '_');
  XLSX.writeFile(wb, `Historial_${nombre}.xlsx`);
  toast(`✓ Historial de ${est.nombre} descargado`);
}

// ══════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════
function v(id)      { return document.getElementById(id)?.value?.trim() || ''; }
function hoy()      { return new Date().toLocaleDateString('es-CO'); }
function limpiar(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); }

function poblarSelect(selectId, lista, labelFn) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = '<option value="">— Seleccionar —</option>';
  lista.forEach(item => {
    const o = document.createElement('option');
    o.value = item.id;
    o.textContent = labelFn(item);
    sel.appendChild(o);
  });
}

function poblarSel(selectId, lista) {
  poblarSelect(selectId, lista, e => `${e.nombre} ${e.apellido} — ${e.cedula}`);
}

function irHistorial(estId) {
  ir('historial');
  setTimeout(() => {
    poblarSel('sel-hist', DB.estudiantes);
    document.getElementById('sel-hist').value = estId;
    renderHistorial();
  }, 50);
}

function inscribirA(estId) {
  abrirModal('m-ins');
  setTimeout(() => {
    document.getElementById('i-est').value = estId;
    cargarAsignaturas();
  }, 50);
}