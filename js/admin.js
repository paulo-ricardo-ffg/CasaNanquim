/**
 * CASA NANQUIM - PAINEL ADMIN (SEGURO)
 * CORREÇÃO: estatísticas agora reagem aos filtros e busca
 */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRJplEccWvNLu9WVBeVygAylrdj6jHC9Pk5cbQKe3WORpaYooYb356c6PHRDikx8ph/exec';

let SESSION_TOKEN = null;
let reservasData = [];
let currentEditId = null;
let autoRefreshInterval = null;

// Filtros ativos
let activeFilters = {
  nome: '',
  telefone: '',
  dataExata: '',
  mes: '',
  status: ''
};

// ======================= AUXILIARES =======================
function ordenarPorIdMaisRecente(reservas) {
  if (!reservas || !Array.isArray(reservas)) return [];
  return reservas.sort((a, b) => (b.id || 0) - (a.id || 0));
}

function normalizarHorario(horario) {
  if (!horario) return '';
  if (typeof horario === 'string' && /^\d{2}:\d{2}$/.test(horario)) return horario;
  if (typeof horario === 'number') {
    const totalMinutos = Math.round(horario * 24 * 60);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }
  if (horario instanceof Date) return horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const str = String(horario);
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return str;
}

function formatarDataParaExibicao(valor) {
  if (!valor) return '-';
  if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [ano, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  if (typeof valor === 'string' && valor.includes('T')) {
    const data = new Date(valor);
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  if (valor instanceof Date) {
    const dia = valor.getDate().toString().padStart(2, '0');
    const mes = (valor.getMonth() + 1).toString().padStart(2, '0');
    const ano = valor.getFullYear();
    return `${dia}/${mes}/${ano}`;
  }
  return String(valor);
}

function formatarDataParaInput(valor) {
  if (!valor) return '';
  if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}/)) return valor;
  if (typeof valor === 'string' && valor.includes('/')) {
    const [dia, mes, ano] = valor.split('/');
    return `${ano}-${mes}-${dia}`;
  }
  if (valor instanceof Date) return valor.toISOString().split('T')[0];
  return String(valor);
}

function formatarHorario(valor) { return normalizarHorario(valor); }

function formatarTimestamp(timestamp) {
  if (!timestamp) return '-';
  try {
    const data = new Date(timestamp);
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear();
    const horas = data.getHours().toString().padStart(2, '0');
    const minutos = data.getMinutes().toString().padStart(2, '0');
    return `${dia}/${mes}/${ano} ${horas}:${minutos}`;
  } catch (e) { return timestamp; }
}

function formatarWhatsApp(whatsapp) {
  if (!whatsapp) return '';
  let numero = whatsapp.replace(/\D/g, '');
  if (!numero.startsWith('55')) numero = '55' + numero;
  return numero;
}

function gerarMensagemWhatsApp(nome, data, horario, duracao, status) {
  let duracaoTexto = duracao === '2h' ? '2 horas' : duracao === '4h' ? '4 horas' : '8 horas';
  let statusTexto = status === 'Confirmado' ? 'CONFIRMADA' : status === 'Cancelado' ? 'CANCELADA' : 'PENDENTE';
  const mensagem = `Olá ${nome}, sua reserva para o dia ${data} as ${horario} com duração de ${duracaoTexto} esta ${statusTexto} na Casa Nanquim!\n\nAguardamos voce! Qualquer duvida, estamos a disposicao.\n\nEndereco: R. Jose Mascarenhas, 1051 - Vila Matilde, SP\nContato: (11) 99999-9999\nInstagram: https://www.instagram.com/casananquim/`;
  return encodeURIComponent(mensagem);
}

function gerarMensagemEmail(nome, data, horario, duracao, status) {
  let statusTexto = status === 'Confirmado' ? 'CONFIRMADA' : status === 'Cancelado' ? 'CANCELADA' : 'PENDENTE';
  return `Olá ${nome},\n\nSua reserva na Casa Nanquim foi ${statusTexto}!\n\nData: ${data}\nHorario: ${horario}\nDuração: ${duracao}\n\nEstamos ansiosos para recebe-lo em nosso estúdio!\n\nEndereco: R. Jose Mascarenhas, 1051 - Vila Matilde, SP\nInstagram: @casananquim\n\nQualquer duvida, entre em contato pelo WhatsApp.\n\nAtenciosamente,\nEquipe Casa Nanquim`;
}

function abrirWhatsApp(whatsapp, nome, data, horario, duracao, status) {
  if (!whatsapp) { alert('WhatsApp nao informado!'); return; }
  const numero = formatarWhatsApp(whatsapp);
  const mensagem = gerarMensagemWhatsApp(nome, data, horario, duracao, status);
  window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
}

function abrirEmail(email, nome, data, horario, duracao, status) {
  if (!email) { alert('Email nao informado!'); return; }
  const assunto = encodeURIComponent(`Casa Nanquim - Sua reserva foi ${status}`);
  const corpo = encodeURIComponent(gerarMensagemEmail(nome, data, horario, duracao, status));
  window.open(`mailto:${email}?subject=${assunto}&body=${corpo}`, '_blank');
}

// ======================= LOGIN =======================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorDiv = document.getElementById('loginError');
  const btnLogin = e.target.querySelector('button[type="submit"]');
  errorDiv.textContent = '';
  btnLogin.disabled = true;
  btnLogin.textContent = 'Verificando...';
  try {
    const params = new URLSearchParams();
    params.append('action', 'adminLogin');
    params.append('username', username);
    params.append('password', password);
    const response = await fetch(SCRIPT_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const result = await response.json();
    if (result.success && result.sessionToken) {
      SESSION_TOKEN = result.sessionToken;
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      carregarReservas();
      iniciarAutoRefresh();
    } else {
      errorDiv.textContent = result.error || 'Usuário ou senha inválidos!';
    }
  } catch (err) {
    errorDiv.textContent = 'Erro de conexão. Tente novamente.';
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = 'Entrar';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  SESSION_TOKEN = null;
  pararAutoRefresh();
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('loginError').textContent = '';
});

// ======================= AUTO REFRESH =======================
function iniciarAutoRefresh() {
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(() => carregarReservasSilencioso(), 60000);
}
function pararAutoRefresh() {
  if (autoRefreshInterval) { clearInterval(autoRefreshInterval); autoRefreshInterval = null; }
}

async function carregarReservasSilencioso() {
  if (!SESSION_TOKEN) return;
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAllBookings&sessionToken=${SESSION_TOKEN}`);
    const data = await response.json();
    if (data.success) {
      reservasData = ordenarPorIdMaisRecente(data.bookings || []);
      popularSelectMeses();
      renderizarTabela(); // aqui já recalcula stats
      const refreshBtn = document.getElementById('refreshBtn');
      const originalText = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Atualizado!';
      setTimeout(() => { if (refreshBtn) refreshBtn.innerHTML = originalText; }, 1500);
    } else if (data.sessionExpired) {
      alert('Sessão expirada. Faça login novamente.');
      document.getElementById('logoutBtn').click();
    }
  } catch (error) { console.warn(error); }
}

async function carregarReservas() {
  if (!SESSION_TOKEN) return;
  const loading = document.getElementById('tableLoading');
  const content = document.getElementById('tableContent');
  loading.style.display = 'block';
  content.innerHTML = '';
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getAllBookings&sessionToken=${SESSION_TOKEN}`);
    const data = await response.json();
    if (data.success) {
      reservasData = ordenarPorIdMaisRecente(data.bookings || []);
      popularSelectMeses();
      renderizarTabela();
    } else if (data.sessionExpired) {
      alert('Sessão expirada. Faça login novamente.');
      document.getElementById('logoutBtn').click();
    } else {
      content.innerHTML = `<div class="alert alert-danger m-3">${data.error}</div>`;
    }
  } catch (error) {
    content.innerHTML = `<div class="alert alert-danger m-3">Erro ao carregar: ${error.message}</div>`;
  }
  loading.style.display = 'none';
}

// ======================= CORAÇÃO DA CORREÇÃO: STATS USANDO DADOS FILTRADOS =======================
function atualizarStatsComDados(dadosFiltrados) {
  const total = dadosFiltrados.length;
  const totalHoras = dadosFiltrados.reduce((acc, r) => {
    const horas = r.duracao === '2h' ? 2 : r.duracao === '4h' ? 4 : 8;
    return acc + horas;
  }, 0);
  const totalValor = dadosFiltrados.reduce((acc, r) => acc + parseFloat(r.valor || 0), 0);
  const confirmados = dadosFiltrados.filter(r => r.status === 'Confirmado').length;
  document.getElementById('totalReservas').textContent = total;
  document.getElementById('totalHoras').textContent = totalHoras;
  document.getElementById('totalValor').textContent = `R$ ${totalValor.toFixed(2)}`;
  document.getElementById('totalConfirmados').textContent = confirmados;
  console.log('Stats atualizados com', dadosFiltrados.length, 'registros'); // diagnóstico
}

function getFilteredData() {
  return reservasData.filter(r => {
    if (activeFilters.nome && !(r.nome || '').toLowerCase().includes(activeFilters.nome.toLowerCase())) return false;
    if (activeFilters.telefone && !(r.whatsapp || '').includes(activeFilters.telefone)) return false;
    if (activeFilters.dataExata) {
      const dataReserva = formatarDataParaInput(r.data);
      if (dataReserva !== activeFilters.dataExata) return false;
    }
    if (activeFilters.mes) {
      const mesReserva = r.data ? r.data.substring(0,7) : '';
      if (mesReserva !== activeFilters.mes) return false;
    }
    if (activeFilters.status && (r.status || 'Pendente') !== activeFilters.status) return false;
    return true;
  });
}

function getDadosExibidos() {
  let dados = getFilteredData(); // aplica filtros avançados
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  if (searchTerm) {
    dados = dados.filter(r =>
      (r.nome || '').toLowerCase().includes(searchTerm) ||
      (r.data || '').includes(searchTerm) ||
      (r.whatsapp || '').includes(searchTerm) ||
      (r.status || '').toLowerCase().includes(searchTerm)
    );
  }
  return dados;
}

function popularSelectMeses() {
  const mesesSet = new Set();
  reservasData.forEach(r => {
    if (r.data && r.data.match(/\d{4}-\d{2}-\d{2}/)) {
      mesesSet.add(r.data.substring(0,7));
    }
  });
  const select = document.getElementById('filterMes');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Todos os meses</option>';
  Array.from(mesesSet).sort().reverse().forEach(ma => {
    const [ano, mes] = ma.split('-');
    const mesesNomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const nomeMes = mesesNomes[parseInt(mes)-1];
    select.innerHTML += `<option value="${ma}" ${current===ma ? 'selected' : ''}>${nomeMes} / ${ano}</option>`;
  });
}

function renderizarTabela() {
  const dadosExibidos = getDadosExibidos();
  
  // 🔥 ATUALIZA AS ESTATÍSTICAS COM OS DADOS QUE APARECEM NA TELA
  atualizarStatsComDados(dadosExibidos);

  if (dadosExibidos.length === 0) {
    document.getElementById('tableContent').innerHTML = '<div class="text-center p-5">Nenhuma reserva encontrada</div>';
    return;
  }

  const html = `
    <table class="table table-dark table-striped">
      <thead>
        <tr><th>ID</th><th>Data</th><th>Horário</th><th>Duração</th><th>Valor</th><th>Nome</th><th>WhatsApp</th><th>Email</th><th>Status</th><th>Timestamp</th><th>Ações</th></tr>
      </thead>
      <tbody>
        ${dadosExibidos.map(reserva => {
          const dataFormatada = formatarDataParaExibicao(reserva.data);
          const horarioFormatado = formatarHorario(reserva.horario);
          const horarioFimFormatado = formatarHorario(reserva.horarioFim);
          const horarioDisplay = horarioFimFormatado && horarioFimFormatado !== '-'
            ? `${horarioFormatado} → ${horarioFimFormatado}` : horarioFormatado;
          const timestampFormatado = formatarTimestamp(reserva.timestamp);
          return `
            <tr>
              <td>${reserva.id || '-'}</td>
              <td>${dataFormatada}</td>
              <td>${horarioDisplay}</td>
              <td>${reserva.duracao || '-'}</td>
              <td>R$ ${parseFloat(reserva.valor || 0).toFixed(2)}</td>
              <td>${reserva.nome || '-'}</td>
              <td>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  <a href="https://wa.me/${formatarWhatsApp(reserva.whatsapp)}" target="_blank" class="whatsapp-link" style="font-size:0.7rem;"><i class="fab fa-whatsapp"></i> ${reserva.whatsapp}</a>
                  <button onclick="abrirWhatsApp('${reserva.whatsapp}','${reserva.nome}','${dataFormatada}','${horarioFormatado}','${reserva.duracao}','${reserva.status}')" class="btn-icon btn-whatsapp" style="font-size:0.65rem;">Enviar</button>
                </div>
               </td>
               <td>
                <div style="display:flex;flex-direction:column;gap:4px;">
                  ${reserva.email ? `<a href="mailto:${reserva.email}" class="email-link" style="font-size:0.7rem;">${reserva.email}</a>` : '-'}
                  ${reserva.email ? `<button onclick="abrirEmail('${reserva.email}','${reserva.nome}','${dataFormatada}','${horarioFormatado}','${reserva.duracao}','${reserva.status}')" class="btn-icon btn-email" style="font-size:0.65rem;">Email</button>` : ''}
                </div>
               </td>
              <td><span class="status-badge status-${(reserva.status || 'Pendente').toLowerCase()}">${reserva.status || 'Pendente'}</span></td>
              <td>${timestampFormatado}</td>
              <td>
                <div class="action-buttons">
                  <button class="btn-icon btn-edit" onclick="abrirModalEditar(${reserva.id})">Editar</button>
                  <button class="btn-icon btn-delete" onclick="excluirReserva(${reserva.id})">Excluir</button>
                </div>
               </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  document.getElementById('tableContent').innerHTML = html;
}

function limparFiltros() {
  activeFilters = { nome: '', telefone: '', dataExata: '', mes: '', status: '' };
  document.getElementById('filterNome').value = '';
  document.getElementById('filterTelefone').value = '';
  document.getElementById('filterDataExata').value = '';
  document.getElementById('filterMes').value = '';
  document.getElementById('filterStatus').value = '';
  renderizarTabela(); // recarrega a tabela e stats
}

function exportarCSV() {
  const dadosExibidos = getDadosExibidos();
  if (dadosExibidos.length === 0) { alert('Nenhum dado para exportar.'); return; }
  const headers = ['ID', 'Nome', 'WhatsApp', 'Email', 'Data', 'Horário', 'Duração', 'Valor', 'Status', 'Solicitado em'];
  const rows = dadosExibidos.map(r => [
    r.id, r.nome, r.whatsapp, r.email || '', r.data, r.horario || '', r.duracao,
    `R$ ${parseFloat(r.valor||0).toFixed(2)}`, r.status,
    r.timestamp ? new Date(r.timestamp).toLocaleString() : ''
  ]);
  const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(["\uFEFF" + csvContent], {type: 'text/csv;charset=utf-8;'});
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.setAttribute('download', 'filtrados.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ======================= EDIÇÃO E EXCLUSÃO =======================
function abrirModalEditar(id) {
  const reserva = reservasData.find(r => r.id === id);
  if (!reserva) return;
  currentEditId = id;
  document.getElementById('editRowId').value = id;
  document.getElementById('editNome').value = reserva.nome || '';
  document.getElementById('editWhatsapp').value = reserva.whatsapp || '';
  document.getElementById('editEmail').value = reserva.email || '';
  document.getElementById('editData').value = formatarDataParaInput(reserva.data);
  document.getElementById('editHorario').value = formatarHorario(reserva.horario);
  document.getElementById('editDuracao').value = reserva.duracao || '2h';
  document.getElementById('editStatus').value = reserva.status || 'Pendente';
  document.getElementById('editModal').classList.add('active');
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!SESSION_TOKEN) { alert('Sessão expirada. Faça login novamente.'); return; }
  const duracao = document.getElementById('editDuracao').value;
  const valor = duracao === '2h' ? 80 : duracao === '4h' ? 150 : 250;
  const dados = {
    id: parseInt(currentEditId),
    nome: document.getElementById('editNome').value,
    whatsapp: document.getElementById('editWhatsapp').value,
    email: document.getElementById('editEmail').value,
    data: document.getElementById('editData').value,
    horario: document.getElementById('editHorario').value,
    duracao: duracao,
    valor: valor,
    status: document.getElementById('editStatus').value
  };
  try {
    const params = new URLSearchParams();
    params.append('action', 'updateBooking');
    params.append('sessionToken', SESSION_TOKEN);
    params.append('data', JSON.stringify(dados));
    const response = await fetch(SCRIPT_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const result = await response.json();
    if (result.success) {
      alert('Reserva atualizada com sucesso!');
      document.getElementById('editModal').classList.remove('active');
      carregarReservas();
    } else if (result.sessionExpired) {
      alert('Sessão expirada. Faça login novamente.');
      document.getElementById('logoutBtn').click();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (error) { alert('Erro ao salvar: ' + error.message); }
});

async function excluirReserva(id) {
  if (!SESSION_TOKEN) { alert('Sessão expirada. Faça login novamente.'); return; }
  if (!confirm('Tem certeza que deseja excluir esta reserva?')) return;
  try {
    const params = new URLSearchParams();
    params.append('action', 'deleteBooking');
    params.append('sessionToken', SESSION_TOKEN);
    params.append('data', JSON.stringify({ id: id }));
    const response = await fetch(SCRIPT_URL, { method: 'POST', body: params, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    const result = await response.json();
    if (result.success) {
      alert('Reserva excluída com sucesso!');
      carregarReservas();
    } else if (result.sessionExpired) {
      alert('Sessão expirada. Faça login novamente.');
      document.getElementById('logoutBtn').click();
    } else {
      alert('Erro: ' + result.error);
    }
  } catch (error) { alert('Erro ao excluir: ' + error.message); }
}

// ======================= EXPOR FUNÇÕES GLOBAIS =======================
window.abrirWhatsApp = abrirWhatsApp;
window.abrirEmail = abrirEmail;
window.abrirModalEditar = abrirModalEditar;
window.excluirReserva = excluirReserva;

// ======================= EVENT LISTENERS =======================
document.getElementById('refreshBtn').addEventListener('click', () => carregarReservas());
document.getElementById('searchInput').addEventListener('keyup', () => renderizarTabela());
document.getElementById('closeModalBtn').addEventListener('click', () => document.getElementById('editModal').classList.remove('active'));
document.getElementById('editModal').addEventListener('click', (e) => { if (e.target === document.getElementById('editModal')) document.getElementById('editModal').classList.remove('active'); });

// Botões de filtro
document.getElementById('applyFiltersBtn').addEventListener('click', () => {
  activeFilters = {
    nome: document.getElementById('filterNome').value.trim(),
    telefone: document.getElementById('filterTelefone').value.trim(),
    dataExata: document.getElementById('filterDataExata').value,
    mes: document.getElementById('filterMes').value,
    status: document.getElementById('filterStatus').value
  };
  renderizarTabela();
});
document.getElementById('clearFiltersBtn').addEventListener('click', limparFiltros);
document.getElementById('exportCsvBtn').addEventListener('click', exportarCSV);

// Expansão dos filtros avançados
const toggleBtn = document.getElementById('toggleAdvancedBtn');
const advancedDiv = document.getElementById('advancedFilters');
if (toggleBtn && advancedDiv) {
  toggleBtn.addEventListener('click', () => {
    advancedDiv.classList.toggle('open');
    toggleBtn.innerHTML = advancedDiv.classList.contains('open')
      ? '<i class="fas fa-chevron-up"></i> Filtros avançados'
      : '<i class="fas fa-chevron-down"></i> Filtros avançados';
  });
}
