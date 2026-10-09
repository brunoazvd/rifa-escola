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
// Estado local da aplicação

let estadoLocal = {
  numeros: []
};

// ==========================================
// INTEGRAÇÃO COM O JSONBIN.IO
// ==========================================
async function carregarDadosDoBanco() {
  mostrarStatus("Carregando dados da nuvem...");
  try {
    const res = await fetch(`${URL_BIN}/latest`, {
      method: 'GET',
      headers: { 'X-Master-Key': API_KEY }
    });

    if (!res.ok) throw new Error("Erro ao buscar dados do JSONBin");

    const data = await res.json();
    estadoLocal.numeros = data.record.numeros || [];
    
    // Garante ordenação crescente inicial
    estadoLocal.numeros.sort((a, b) => a - b);
    
    renderizarLista(); // <-- Alterado de renderizarCartelas() para renderizarLista()
    atualizarStats();
    mostrarStatus("Sincronizado!", "sucesso");
  } catch (err) {
    console.error(err);
    mostrarStatus("Erro ao conectar com a nuvem.", "erro");
  }
}

async function salvarDadosNoBanco() {
  mostrarStatus("Salvando alterações...");
  try {
    const res = await fetch(URL_BIN, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY
      },
      body: JSON.stringify({ numeros: estadoLocal.numeros })
    });

    if (!res.ok) throw new Error("Erro ao salvar no JSONBin");

    atualizarStats();
    mostrarStatus("Sincronizado!", "sucesso");
  } catch (err) {
    console.error(err);
    mostrarStatus("Erro ao salvar dados.", "erro");
  }
}

function mostrarStatus(mensagem, tipo = "info") {
  const el = document.getElementById('status-rede');
  el.innerText = mensagem;
  el.className = `status-${tipo}`;
}

// ==========================================
// LÓGICA DE INTERFACE
// ==========================================
function atualizarStats() {
  const totalVendidos = estadoLocal.numeros.length;
  document.getElementById('stat-vendidos').innerText = `${totalVendidos} / 100`;
  document.getElementById('stat-arrecadado').innerText = `R$ ${(totalVendidos * VALOR_NUMERO).toFixed(2).replace('.', ',')}`;
}

function renderizarLista(filtro = '') {
  const container = document.getElementById('container-numeros');
  container.innerHTML = '';

  // Filtra por busca se houver algo digitado
  const numerosExibicao = estadoLocal.numeros.filter(num => 
    num.toString().includes(filtro.trim())
  );

  if (numerosExibicao.length === 0) {
    container.innerHTML = '<span style="color: #888;">Nenhum número encontrado.</span>';
    return;
  }

  numerosExibicao.forEach(num => {
    const tag = document.createElement('div');
    tag.className = 'tag-numero';
    tag.innerHTML = `
      <span>${num}</span>
      <button class="btn-remover" title="Remover número" onclick="removerNumero(${num})">&times;</button>
    `;
    container.appendChild(tag);
  });
}

async function adicionarNumero(event) {
  event.preventDefault();
  const input = document.getElementById('input-numero');
  const num = parseInt(input.value, 10);

  if (isNaN(num) || num < 1 || num > 1500) {
    alert('Digite um número válido entre 1 e 1500.');
    return;
  }

  if (estadoLocal.numeros.includes(num)) {
    alert(`O número ${num} já foi adicionado!`);
    input.value = '';
    return;
  }

  // Adiciona e ordena de forma crescente
  estadoLocal.numeros.push(num);
  estadoLocal.numeros.sort((a, b) => a - b);

  input.value = '';
  input.focus();

  // Limpa o filtro de busca ao adicionar um novo
  document.getElementById('input-busca').value = '';

  renderizarLista();
  await salvarDadosNoBanco();
}

async function removerNumero(num) {
  if (confirm(`Tem certeza que deseja remover o número ${num}?`)) {
    const index = estadoLocal.numeros.indexOf(num);
    if (index !== -1) {
      estadoLocal.numeros.splice(index, 1);
      
      const filtro = document.getElementById('input-busca').value;
      renderizarLista(filtro);
      await salvarDadosNoBanco();
    }
  }
}

function filtrarNumeros() {
  const termo = document.getElementById('input-busca').value;
  renderizarLista(termo);
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
// SORTEIO
// ==========================================
function realizarSorteio() {
  const elegiveis = estadoLocal.numeros;

  if (elegiveis.length === 0) {
    alert('Nenhum número cadastrado para o sorteio!');
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

      // Identifica a faixa de cartela correspondente (ex: 1-10, 11-20)
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

// Inicialização
window.addEventListener('DOMContentLoaded', carregarDadosDoBanco);