/**
 * ============================================
 * CASA NANQUIM - SISTEMA DE RESERVA (SEM RESTRIÇÃO DE HORÁRIO)
 * ============================================
 */

AOS.init({ duration: 800, once: true });

window.addEventListener('scroll', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }
});

document.addEventListener('click', (e) => {
  const ink = document.createElement('div');
  ink.classList.add('ink-effect');
  ink.style.left = e.clientX + 'px';
  ink.style.top = e.clientY + 'px';
  document.body.appendChild(ink);
  setTimeout(() => ink.remove(), 600);
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href && href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

document.getElementById('currentYear').textContent = new Date().getFullYear();

// ============================================
// CONFIGURAÇÕES
// ============================================

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRJplEccWvNLu9WVBeVygAylrdj6jHC9Pk5cbQKe3WORpaYooYb356c6PHRDikx8ph/exec';
const TOKEN = 'casa_nanquim_2025_secret_token';
const HORARIOS_BASE = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

let duracaoHoras = null;
let duracaoSelecionada = null;
let valorSelecionado = null;
let dataSelecionada = null;
let horarioSelecionado = null;
let reservasExistentes = [];

const dataInput = document.getElementById('data');
const horariosContainer = document.getElementById('horariosContainer');
const submitBtn = document.getElementById('submitBtn');
const mensagemDiv = document.getElementById('mensagem');
const statusIcon = document.getElementById('statusIcon');
const statusText = document.getElementById('statusText');
const ultimaAtualizacao = document.getElementById('ultimaAtualizacao');

// ============================================
// FUNÇÃO PARA NORMALIZAR HORÁRIO (CORRIGIDA)
// ============================================

function normalizarHorario(horario) {
  if (!horario) return '';
  
  if (typeof horario === 'string' && /^\d{2}:\d{2}$/.test(horario)) {
    return horario;
  }
  
  if (typeof horario === 'number') {
    const totalMinutos = Math.round(horario * 24 * 60);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  }
  
  if (horario instanceof Date) {
    return horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  
  const str = String(horario);
  const match = str.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  
  return str;
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

function atualizarStatus(status, texto) {
  if (status === 'online') {
    statusIcon.className = 'fas fa-check-circle me-2';
    statusIcon.style.color = '#00ff00';
    statusText.textContent = 'Conectado';
    ultimaAtualizacao.textContent = texto;
  } else {
    statusIcon.className = 'fas fa-exclamation-triangle me-2';
    statusIcon.style.color = '#ff6600';
    statusText.textContent = 'Erro de conexão';
    ultimaAtualizacao.textContent = texto;
  }
}

async function buscarReservas() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getBookings&token=${TOKEN}`);
    const data = await response.json();
    if (data.success) {
      reservasExistentes = (data.bookings || []).map(r => ({
        ...r,
        horario: normalizarHorario(r.horario)
      }));
      atualizarStatus('online', `Atualizado ${new Date().toLocaleTimeString()}`);
      return reservasExistentes;
    }
  } catch (error) {
    console.error('Erro:', error);
    atualizarStatus('offline', 'Erro de conexão');
    return [];
  }
}

function calcularFim(inicio, horas) {
  const inicioNorm = normalizarHorario(inicio);
  const [h, m] = inicioNorm.split(':').map(Number);
  let horaFim = h + horas;
  return `${horaFim.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// Função isHorarioOcupado REMOVIDA - nunca bloqueamos horários

function gerarHorariosDisponiveis() {
  if (!duracaoHoras || !dataSelecionada) return [];
  const horariosDisponiveis = [];
  for (const inicio of HORARIOS_BASE) {
    const inicioHora = parseInt(inicio.split(':')[0]);
    const fimHora = inicioHora + duracaoHoras;
    if (fimHora <= 20) {
      const fim = calcularFim(inicio, duracaoHoras);
      horariosDisponiveis.push({
        inicio: inicio, fim: fim, ocupado: false, display: `${inicio} - ${fim}`
      });
    }
  }
  return horariosDisponiveis;
}

function renderizarHorarios() {
  if (!duracaoHoras) {
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração da sessão</div>';
    return;
  }
  if (!dataSelecionada) {
    horariosContainer.innerHTML = '<div class="texto-muted">Selecione uma data</div>';
    return;
  }

  const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
  const dataObjUTC = new Date(Date.UTC(ano, mes - 1, dia));
  const diaSemanaUTC = dataObjUTC.getUTCDay();

  const hojeUTC = new Date();
  hojeUTC.setUTCHours(0, 0, 0, 0);
  const dataSelecionadaUTC = new Date(Date.UTC(ano, mes - 1, dia));

  if (dataSelecionadaUTC < hojeUTC) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Data passada</div>';
    return;
  }

  if (diaSemanaUTC === 0 || diaSemanaUTC === 6) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Estúdio fechado aos fins de semana (sábado e domingo)</div>';
    return;
  }

  const horarios = gerarHorariosDisponiveis();
  if (horarios.length === 0) {
    horariosContainer.innerHTML = '<div class="alert alert-danger">⚠️ Nenhum horário disponível para esta duração</div>';
    return;
  }

  const html = horarios.map(h => `
    <button type="button" class="horario-btn ${horarioSelecionado === h.inicio ? 'selected' : ''}"
            data-inicio="${h.inicio}" data-fim="${h.fim}">
      ${h.display}
    </button>
  `).join('');
  horariosContainer.innerHTML = html;

  document.querySelectorAll('.horario-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      horarioSelecionado = btn.dataset.inicio;
    });
  });
}

function initDuracao() {
  const botoes = document.querySelectorAll('.opcao-btn');
  botoes.forEach(btn => {
    btn.addEventListener('click', async () => {
      botoes.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      duracaoHoras = parseInt(btn.dataset.duracao);
      duracaoSelecionada = btn.dataset.duracao + 'h';
      valorSelecionado = btn.dataset.valor;
      horarioSelecionado = null;
      if (dataSelecionada) {
        await buscarReservas();
        renderizarHorarios();
      }
    });
  });
}

async function onDataChange() {
  dataSelecionada = dataInput.value;
  horarioSelecionado = null;
  if (dataSelecionada && duracaoHoras) {
    await buscarReservas();
    renderizarHorarios();
  } else if (dataSelecionada && !duracaoHoras) {
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração da sessão</div>';
  } else {
    horariosContainer.innerHTML = '<div class="texto-muted">Selecione uma data</div>';
  }
}

async function enviarReserva(dados) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'createBooking');
    params.append('token', TOKEN);
    params.append('data', JSON.stringify(dados));
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return await response.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function mostrarMensagem(texto, tipo) {
  const classe = tipo === 'sucesso' ? 'alert-success' : 'alert-danger';
  mensagemDiv.innerHTML = `<div class="alert ${classe}">${texto}</div>`;
  setTimeout(() => {
    if (mensagemDiv.innerHTML.includes(texto)) mensagemDiv.innerHTML = '';
  }, 5000);
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.innerHTML = loading
    ? '<span class="loading-spinner"></span> Enviando...'
    : '<i class="fas fa-calendar-check me-2"></i> Solicitar Reserva';
}

async function onSubmit(e) {
  e.preventDefault();
  const nome = document.getElementById('nome').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const email = document.getElementById('email').value.trim();
  if (!nome) return mostrarMensagem('⚠️ Informe seu nome', 'erro');
  if (!whatsapp) return mostrarMensagem('⚠️ Informe seu WhatsApp', 'erro');
  if (!duracaoHoras) return mostrarMensagem('⚠️ Selecione a duração da sessão', 'erro');
  if (!dataSelecionada) return mostrarMensagem('⚠️ Selecione uma data', 'erro');
  if (!horarioSelecionado) return mostrarMensagem('⚠️ Selecione um horário', 'erro');
  
  setLoading(true);
  const fim = calcularFim(horarioSelecionado, duracaoHoras);
  const dados = {
    data: dataSelecionada, horario: horarioSelecionado, horarioFim: fim,
    duracao: duracaoSelecionada, duracaoHoras: duracaoHoras, valor: valorSelecionado,
    nome: nome, whatsapp: whatsapp, email: email,
    timestamp: new Date().toISOString(), status: 'Pendente'
  };
  const result = await enviarReserva(dados);
  if (result.success) {
    mostrarMensagem('✅ Reserva solicitada com sucesso! Entraremos em contato.', 'sucesso');
    document.getElementById('reservaForm').reset();
    duracaoHoras = null; duracaoSelecionada = null; valorSelecionado = null;
    dataSelecionada = null; horarioSelecionado = null;
    dataInput.value = '';
    horariosContainer.innerHTML = '<div class="texto-muted">Primeiro, selecione a duração e a data</div>';
    document.querySelectorAll('.opcao-btn').forEach(btn => btn.classList.remove('selected'));
    await buscarReservas();
  } else {
    mostrarMensagem(`❌ ${result.error}`, 'erro');
  }
  setLoading(false);
}

// ============================================
// INICIALIZAÇÃO
// ============================================

async function init() {
  initDuracao();
  dataInput.addEventListener('change', onDataChange);
  document.getElementById('reservaForm').addEventListener('submit', onSubmit);
  const hoje = new Date().toISOString().split('T')[0];
  dataInput.min = hoje;
  await buscarReservas();
  setInterval(async () => {
    if (dataSelecionada && duracaoHoras) {
      await buscarReservas();
      renderizarHorarios();
    }
  }, 10000);
}

init();
