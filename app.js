// ==========================================
// CONFIGURAÇÃO DO JSONBIN.IO
// ==========================================
const BIN_ID = "6ac92f67ffd5d160535d1902";      // Ex: "65f3a12312a0234"
const API_KEY = "$2a$10$SutGB4fI8rITvwdmP36pVe1AhskLxSOqyzQSECB5Hula8SrH50Chq"; // Ex: "$2b$10$abc123xyz..."

const URL_BIN = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

// ==========================================
// ESTRUTURA E CONFIGURAÇÕES DA RIFA
// ==========================================
const VALOR_NUMERO = 5;
const TOTAL_CARTELAS = 10; // 10 cartelas de 10 números (1 a 100)

// Estado local da aplicação
let estadoLocal = {
  numeros: [] // Guarda apenas o array de números vendidos/pagos
};

// Mapeamento fixo de cartelas e faixas para facilitar renderização
const cartelasEstaticas = Array.from({ length: TOTAL_CARTELAS }, (_, i) => {
  const inicio = i * 10 + 1;
  return {
    id: i + 1,
    faixa: `${inicio}-${inicio + 9}`,
    inicio: inicio,
    fim: inicio + 9
  };
});

// ==========================================
// INTEGRAÇÃO COM A API DO JSONBIN.IO
// ==========================================

// Lê os dados do banco na nuvem
async function carregarDadosDoBanco() {
  mostrarStatus("Carregando dados da nuvem...");
  try {
    const res = await fetch(`${URL_BIN}/latest`, {
      method: 'GET',
      headers: {
        'X-Master-Key': API_KEY
      }
    });

    if (!res.ok) throw new Error("Erro ao buscar dados do JSONBin");

    const data = await res.json();
    estadoLocal.numeros = data.record.numeros || [];
    
    renderizarCartelas();
    atualizarStats();
    mostrarStatus("Sincronizado!", "sucesso");
  } catch (err) {
    console.error(err);
    mostrarStatus("Erro ao conectar com o banco de dados.", "erro");
  }
}

// Salva o array atualizado de números no JSONBin
async function salvarDadosNoBanco() {
  mostrarStatus("Salvando alterações na nuvem...");
  try {
    const res = await fetch(URL_BIN, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify({ numeros: estadoLocal.numeros })
    });

    if (!res.ok) throw new Error("Erro ao salvar dados no JSONBin");

    atualizarStats();
    mostrarStatus("Sincronizado!", "sucesso");
  } catch (err) {
    console.error(err);
    mostrarStatus("Erro ao salvar dados na nuvem.", "erro");
  }
}

// Mensagem discreta no topo para status de rede
function mostrarStatus(mensagem, tipo = "info") {
  let el = document.getElementById('status-rede');
  if (!el) {
    el = document.createElement('div');
    el.id = 'status-rede';
    document.body.prepend(el);
  }
  el.innerText = mensagem;
  el.className = `status-${tipo}`;
}

// ==========================================
// LÓGICA DE INTERFACE E EVENTOS
// ==========================================

function atualizarStats() {
  const totalVendidos = estadoLocal.numeros.length;
  document.getElementById('stat-vendidos').innerText = `${totalVendidos} / 100`;
  document.getElementById('stat-arrecadado').innerText = `R$ ${(totalVendidos * VALOR_NUMERO).toFixed(2).replace('.', ',')}`;
}

function renderizarCartelas() {
  const container = document.getElementById('grid-cartelas');
  container.innerHTML = '';

  cartelasEstaticas.forEach((cartela) => {
    const div = document.createElement('div');
    div.className = 'cartela-item';

    let htmlNumeros = '';
    for (let num = cartela.inicio; num <= cartela.fim; num++) {
      const estaPago = estadoLocal.numeros.includes(num);
      htmlNumeros += `
        <button class="num-btn ${estaPago ? 'pago' : ''}" onclick="alternarBaixa(${num})">
          ${num}
        </button>
      `;
    }

    div.innerHTML = `
      <div class="cartela-header">
        <strong>Cartela (${cartela.faixa})</strong>
      </div>
      <div class="numeros-grid">${htmlNumeros}</div>
    `;
    container.appendChild(div);
  });
}

// Alterna baixa de um número e atualiza a nuvem
async function alternarBaixa(numero) {
  const index = estadoLocal.numeros.indexOf(numero);

  if (index === -1) {
    // Adiciona número ao array
    estadoLocal.numeros.push(numero);
  } else {
    // Remove número do array
    estadoLocal.numeros.splice(index, 1);
  }

  // Ordena para manter organizado no banco
  estadoLocal.numeros.sort((a, b) => a - b);

  // Atualiza a tela imediatamente para resposta rápida e envia ao banco
  renderizarCartelas();
  await salvarDadosNoBanco();
}

function mudarAba(aba) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('active'));

  if (aba === 'baixa') {
    document.querySelectorAll('.tab-btn')[0].classList.add('active');
    document.getElementById('aba-baixa').classList.add('active');
  } else {
    document.querySelectorAll('.tab-btn')[1].classList.add('active');
    document.getElementById('aba-sorteio').classList.add('active');
  }
}

// ==========================================
// MÓDULO DE SORTEIO
// ==========================================
function realizarSorteio() {
  const elegiveis = estadoLocal.numeros;

  if (elegiveis.length === 0) {
    alert('Nenhum número foi baixado/pago até o momento!');
    return;
  }

  const visor = document.getElementById('visor-numero');
  const btn = document.getElementById('btn-sortear');
  const resDiv = document.getElementById('resultado-sorteio');
  btn.disabled = true;
  resDiv.innerText = '';

  let contagem = 0;
  const intervalo = setInterval(() => {
    const tempIndex = Math.floor(Math.random() * elegiveis.length);
    visor.innerText = elegiveis[tempIndex];
    contagem++;

    if (contagem > 30) {
      clearInterval(intervalo);
      const vencedor = elegiveis[Math.floor(Math.random() * elegiveis.length)];
      visor.innerText = vencedor;
      
      // Identifica a cartela correspondente
      const cartelaNum = Math.ceil(vencedor / 10);
      const faixa = `${(cartelaNum - 1) * 10 + 1}-${cartelaNum * 10}`;

      resDiv.innerHTML = `
        🏆 Número Sorteado: <strong>${vencedor}</strong><br>
         Pertence à Cartela: <strong>${faixa}</strong>
      `;
      btn.disabled = false;
    }
  }, 100);
}

// Carrega os dados da nuvem ao abrir a página
window.addEventListener('DOMContentLoaded', carregarDadosDoBanco);