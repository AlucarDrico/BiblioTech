// ==========================================
// SEÇÃO 1: IMPORTAÇÃO DOS MÓDULOS DO FIREBASE
// Importamos apenas as funções necessárias do SDK modular (v10) para deixar o app leve.
// ==========================================

// Importa a função principal para inicializar o aplicativo Firebase na memória do navegador.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// Importa o serviço de Banco de Dados NoSQL (Firestore) e suas funções de manipulação de dados.
import { 
  getFirestore, // Função para conectar e obter a instância do banco Firestore.
  collection,   // Função para apontar para uma coleção (como uma pasta/tabela) dentro do banco.
  addDoc,       // Função para criar/inserir um novo documento (registro) no banco.
  onSnapshot,   // Função de "escuta em tempo real": executa um código sempre que o banco mudar.
  doc,          // Função para criar uma referência apontando para um documento específico pelo ID.
  updateDoc,    // Função para atualizar os dados de um documento existente.
  deleteDoc,    // Função para apagar um documento específico do banco.
  serverTimestamp // Função que pega o horário/data exato do servidor do Google para evitar fraudes locais.
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Importa o serviço de Autenticação do Firebase e suas funções de controle de usuário.
import {
  getAuth,                       // Função para conectar e obter a instância do sistema de login/senha.
  createUserWithEmailAndPassword, // Função assíncrona para registrar um novo usuário com e-mail e senha.
  signInWithEmailAndPassword,     // Função assíncrona para autenticar/logar um usuário existente.
  signOut,                        // Função para encerrar a sessão do usuário ativo (fazer logout).
  onAuthStateChanged             // Observador que dispara automaticamente quando o usuário entra ou sai.
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


// ==========================================
// SEÇÃO 2: CONFIGURAÇÃO E INICIALIZAÇÃO
// Guardamos os dados de acesso e ligamos os motores do Firebase.
// ==========================================

// Objeto contendo as chaves de acesso públicas do projeto Firebase "Bibliotech".
const firebaseConfig = {
  apiKey: "AIzaSyDAQENqu8SpczaPmZ-njSGMOLMtcRkD6W0", // Chave de API de identificação do projeto.
  authDomain: "bibliotech-cdd87.firebaseapp.com",     // Domínio de autenticação seguro.
  projectId: "bibliotech-cdd87",                     // ID único do projeto nos servidores do Google.
  storageBucket: "bibliotech-cdd87.firebasestorage.app", // Endereço para futuro armazenamento de arquivos.
  messagingSenderId: "223374026716",                // ID para envio de notificações/mensagens.
  appId: "1:223374026716:web:83756b8ec083afe8331119" // ID interno da aplicação web.
};

// Inicializa a conexão principal do Firebase no navegador passando as credenciais acima.
const app = initializeApp(firebaseConfig);

// Inicializa o serviço do banco de dados Firestore vinculado ao nosso aplicativo.
const db = getFirestore(app);

// Inicializa o serviço de autenticação de usuários vinculado ao nosso aplicativo.
const auth = getAuth(app);

// Cria um atalho direto para a coleção chamada "books" dentro do nosso banco de dados.
const booksCollection = collection(db, "books");


// ==========================================
// SEÇÃO 3: VARIÁVEIS DE ESTADO DA APLICAÇÃO
// Armazenam os dados na memória RAM do navegador durante o uso.
// ==========================================

// Array/Lista vazia que vai guardar a cópia local de todos os livros trazidos do banco de dados.
let booksData = [];

// String/Texto que guarda o termo atual digitado pelo usuário na barra de pesquisa.
let currentSearchTerm = "";

// Objeto que guarda a coluna atual de ordenação e a direção (ascendente ou descendente).
let currentSort = { field: null, direction: "asc" };

// Variável que guardará a função de cancelamento do "ouvinte" em tempo real do banco.
let unsubscribeSnapshot = null;


// ==========================================
// SEÇÃO 4: CAPTURA DE ELEMENTOS DO DOM (INTERFACE HTML)
// Pegamos a referência das tags HTML para poder modificá-las via JavaScript.
// ==========================================

// Elementos da barra de cabeçalho (Relógio, Calendário e Tema)
const widgetDate = document.getElementById("widget-date");     // Div onde é exibida a data atual.
const widgetTime = document.getElementById("widget-time");     // Div onde é exibido o relógio digital.
const themeToggleBtn = document.getElementById("theme-toggle"); // Botão que alterna o modo claro/escuro.
const themeIcon = document.getElementById("theme-icon");       // Ícone visual dentro do botão de tema (Sol/Lua).

// Elementos das telas de Login e Registro
const authSection = document.getElementById("auth-section"); // Seção que envelopa os formulários de login/cadastro.
const appContent = document.getElementById("app-content");   // Seção principal do aplicativo que exibe a tabela.
const btnLogout = document.getElementById("btn-logout");     // Botão de sair da conta no topo da tela.
const tabLogin = document.getElementById("tab-login");       // Aba clicável para mudar para tela de Login.
const tabRegister = document.getElementById("tab-register"); // Aba clicável para mudar para tela de Cadastro.
const loginForm = document.getElementById("login-form");     // Formulário completo de efetuar login.
const registerForm = document.getElementById("register-form"); // Formulário completo de efetuar cadastro.

// Elementos do Formulário de Livros e Tabela de Exibição
const bookForm = document.getElementById("book-form");             // Formulário de inserção/edição de livros.
const bookIdInput = document.getElementById("book-id");           // Campo oculto (hidden) com o ID do livro editado.
const titleInput = document.getElementById("title");             // Campo de entrada do título do livro.
const authorInput = document.getElementById("author");           // Campo de entrada do autor do livro.
const genreInput = document.getElementById("genre");             // Campo de entrada do gênero do livro.
const yearInput = document.getElementById("year");               // Campo de entrada do ano de publicação.
const statusSelect = document.getElementById("status");           // Menu suspenso (select) do status (Disponível/Emprestado).
const formTitle = document.getElementById("form-title");         // Título h2 do formulário (muda entre Cadastrar e Editar).
const btnSubmit = document.getElementById("btn-submit");         // Botão principal de envio do formulário.
const btnCancel = document.getElementById("btn-cancel");         // Botão secundário de cancelar a edição atual.
const searchInput = document.getElementById("search-input");     // Campo de busca/filtragem de texto.
const booksTableBody = document.getElementById("books-table-body"); // Corpo da tabela `<tbody>` onde os livros são desenhados.

// Elementos dos Cards de Estatísticas/Dashboard
const statTotal = document.getElementById("stat-total");           // Span numérico com o total geral de livros.
const statDisponivel = document.getElementById("stat-disponivel"); // Span numérico com total de livros disponíveis.
const statEmprestado = document.getElementById("stat-emprestado"); // Span numérico com total de livros emprestados.

// Botões dos Cabeçalhos da Tabela (Para Ordenação)
const sortTitleBtn = document.getElementById("sort-title");   // Botão no cabeçalho da coluna Título.
const sortAuthorBtn = document.getElementById("sort-author"); // Botão no cabeçalho da coluna Autor.
const sortYearBtn = document.getElementById("sort-year");     // Botão no cabeçalho da coluna Ano.


// ==========================================
// SEÇÃO 5: FUNÇÕES DO RELÓGIO E TEMPO REAL
// Mantém a data e a hora atualizadas a cada segundo.
// ==========================================

// Função responsável por calcular a hora exata e formatar no idioma Português do Brasil.
function updateClock() {
  // Cria um novo objeto `Date` contendo o momento exato em que a função foi chamada.
  const now = new Date();
  
  // Define o formato de exibição da data (Ex: seg., 03 de ago. de 2026).
  const optionsDate = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  
  // Converte a data para texto formatado em pt-BR e atribui à div da interface.
  widgetDate.textContent = now.toLocaleDateString('pt-BR', optionsDate);

  // Converte o horário para texto (HH:MM:SS) em pt-BR e atribui à div da interface.
  widgetTime.textContent = now.toLocaleTimeString('pt-BR');
}

// Executa a função `updateClock` a cada 1000 milissegundos (1 segundo) continuamente.
setInterval(updateClock, 1000);

// Chama a função imediatamente uma primeira vez ao carregar o script para não esperar 1 segundo.
updateClock();


// ==========================================
// SEÇÃO 6: GERENCIAMENTO DE TEMAS (DARK / LIGHT)
// Controla a troca de cores da interface e salva no navegador do usuário.
// ==========================================

// Função que lê a preferência salva no computador ou define o tema padrão como claro.
function initTheme() {
  // Busca o tema salvo na memória LocalStorage; se não existir, define "light".
  const savedTheme = localStorage.getItem("theme") || "light";
  
  // Define o atributo customizado `data-theme` na tag raiz `<html>` para o CSS aplicar as cores.
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  // Atualiza o ícone do botão para o Sol se for escuro, ou para a Lua se for claro.
  themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

// Evento de clique no botão de trocar tema.
themeToggleBtn.addEventListener("click", () => {
  // Lê o tema atual atribuído à tag `<html>`.
  const currentTheme = document.documentElement.getAttribute("data-theme");
  
  // Inverte o valor: se era escuro vira claro, se era claro vira escuro.
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  
  // Aplica o novo tema no atributo da tag `<html>`.
  document.documentElement.setAttribute("data-theme", newTheme);
  
  // Salva o novo tema no `localStorage` do navegador para persistir após recarregar.
  localStorage.setItem("theme", newTheme);
  
  // Atualiza o ícone visual do botão.
  themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙";
});


// ==========================================
// SEÇÃO 7: AUTENTICAÇÃO E SESSÃO DE USUÁRIO
// Alterna entre formulários de login/cadastro e gerencia a entrada/saída no sistema.
// ==========================================

// Clique na aba de Login: Exibe formulário de login e oculta o de cadastro.
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");         // Destaca a aba de login como ativa.
  tabRegister.classList.remove("active");    // Remove destaque da aba de cadastro.
  loginForm.classList.remove("hidden");      // Exibe o formulário de login.
  registerForm.classList.add("hidden");      // Esconde o formulário de cadastro.
});

// Clique na aba de Cadastro: Exibe formulário de cadastro e oculta o de login.
tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");      // Destaca a aba de cadastro como ativa.
  tabLogin.classList.remove("active");       // Remove destaque da aba de login.
  registerForm.classList.remove("hidden");   // Exibe o formulário de cadastro.
  loginForm.classList.add("hidden");         // Esconde o formulário de login.
});

// Evento de envio (submit) do formulário de CADASTRO de novo usuário.
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede o recarregamento padrão da página ao enviar o formulário.
  
  // Obtém o e-mail e a senha informados pelo usuário no formulário.
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;

  try {
    // Tenta criar a conta no Firebase Authentication usando as credenciais informadas.
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Conta criada com sucesso!"); // Notifica o usuário em caso de sucesso.
    registerForm.reset();               // Limpa os campos do formulário.
  } catch (error) {
    // Caso ocorra erro (ex: e-mail duplicado ou senha curta), exibe no console e alerta o usuário.
    console.error("Erro no cadastro:", error);
    alert("Erro ao cadastrar: " + error.message);
  }
});

// Evento de envio (submit) do formulário de LOGIN.
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede o recarregamento padrão da página.
  
  // Obtém os valores dos campos de login.
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    // Envia o e-mail e senha para validação do Firebase Auth.
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset(); // Limpa os campos após o acesso concedido.
  } catch (error) {
    // Caso ocorra erro de validação de dados, informa ao usuário.
    console.error("Erro no login:", error);
    alert("Falha ao autenticar: Usuário ou senha incorretos.");
  }
});

// Clique no botão de LOGOUT para deslogar do sistema.
btnLogout.addEventListener("click", () => {
  signOut(auth); // Desconecta a conta ativa no Firebase Authentication.
});

// Observador Global do Estado da Autenticação do Firebase.
// Esta função roda AUTOMATICAMENTE sempre que alguém entra ou sai do sistema.
onAuthStateChanged(auth, (user) => {
  if (user) {
    // SE houver um usuário logado:
    authSection.classList.add("hidden");     // Oculta a tela de login/cadastro.
    appContent.classList.remove("hidden");   // Exibe o sistema principal de livros.
    btnLogout.classList.remove("hidden");    // Exibe o botão de Sair no cabeçalho.
    initRealtimeListener();                 // Inicia a sincronização de dados com o banco.
  } else {
    // SE NÃO houver usuário logado (Deslogado):
    authSection.classList.remove("hidden");  // Exibe a tela de login/cadastro.
    appContent.classList.add("hidden");      // Esconde a interface principal.
    btnLogout.classList.add("hidden");       // Esconde o botão de Sair.
    
    // Cancela a escuta em tempo real do banco de dados para economizar internet e manter a segurança.
    if (unsubscribeSnapshot) unsubscribeSnapshot();
    booksData = []; // Zera a lista de livros da memória local.
  }
});


// ==========================================
// SEÇÃO 8: LÓGICA DO BANCO DE DADOS E INTERFACE (CRUD)
// Controla a leitura, renderização, busca, filtro e operações no Firestore.
// ==========================================

// Função de segurança sanitizadora de textos para prevenir ataques XSS (injeção de scripts no HTML).
function sanitizeHTML(str) {
  const temp = document.createElement('div'); // Cria um elemento temporário em memória.
  temp.textContent = str;                     // Insere o texto puro convertendo caracteres especiais.
  return temp.innerHTML;                      // Retorna a string segura sanitizada.
}

// Inicia o ouvinte em tempo real do Firestore para a coleção de livros.
function initRealtimeListener() {
  // `onSnapshot` escuta a coleção `books` e roda a função callback toda vez que o banco é alterado.
  unsubscribeSnapshot = onSnapshot(booksCollection, (snapshot) => {
    // Mapeia todos os documentos recebidos e converte num array de objetos JavaScript.
    booksData = snapshot.docs.map(doc => ({
      id: doc.id,     // Extrai o ID único gerado pelo Firestore.
      ...doc.data()   // Clona todas as propriedades do documento (title, author, etc.).
    }));
    
    updateDashboardStats(); // Recalcula as estatísticas dos cards.
    renderTable();           // Desenha a tabela atualizada na tela.
  }, (error) => {
    console.error("Erro ao sincronizar com Firestore: ", error); // Exibe eventuais erros de permissão/rede.
  });
}

// Recalcula e atualiza os números do painel de estatísticas no topo da página.
function updateDashboardStats() {
  const total = booksData.length; // Quantidade total de livros na memória.
  
  // Filtra quantos livros possuem o status "Disponível".
  const disponiveis = booksData.filter(b => b.status === "Disponível").length;
  
  // Filtra quantos livros possuem o status "Emprestado".
  const emprestados = booksData.filter(b => b.status === "Emprestado").length;

  // Escreve os números nos elementos HTML correspondentes.
  statTotal.textContent = total;
  statDisponivel.textContent = disponiveis;
  statEmprestado.textContent = emprestados;
}

// Desenha e atualiza a tabela HTML com base nos dados locais, termos de busca e ordenação.
function renderTable() {
  // 1. Aplica o filtro de busca textual sobre os livros.
  let filtered = booksData.filter(book => {
    const term = currentSearchTerm.toLowerCase(); // Converte o termo buscado para minúsculas.
    
    // Verifica se o título do livro contém o texto buscado.
    const titleMatch = book.title ? book.title.toLowerCase().includes(term) : false;
    
    // Verifica se o autor do livro contém o texto buscado.
    const authorMatch = book.author ? book.author.toLowerCase().includes(term) : false;
    
    // Retorna verdadeiro se encontrar a palavra em um dos dois campos.
    return titleMatch || authorMatch;
  });

  // 2. Aplica a ordenação se houver um campo selecionado pelo usuário.
  if (currentSort.field) {
    filtered.sort((a, b) => {
      let fieldA = a[currentSort.field]; // Valor da propriedade no elemento A.
      let fieldB = b[currentSort.field]; // Valor da propriedade no elemento B.

      // Converte textos para minúsculas para ordenar corretamente sem diferença de maiúsculas.
      if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
      if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();

      // Compara os dois valores para definir quem vem antes.
      if (fieldA < fieldB) return currentSort.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return currentSort.direction === "asc" ? 1 : -1;
      return 0; // Se forem iguais, mantém a ordem.
    });
  }

  // 3. Caso o resultado filtrado seja vazio, exibe mensagem informativa na tabela.
  if (filtered.length === 0) {
    booksTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">Nenhum livro encontrado.</td>
      </tr>
    `;
    return; // Interrompe a execução da função.
  }

  // 4. Mapeia os dados dos livros filtrados e gera as linhas `<tr>` em HTML.
  booksTableBody.innerHTML = filtered.map(book => {
    // Define a classe CSS da badge de acordo com o status.
    const badgeClass = book.status === "Disponível" ? "badge-disponivel" : "badge-emprestado";
    
    // Retorna o template HTML de uma linha da tabela.
    return `
      <tr>
        <td><strong>${sanitizeHTML(book.title)}</strong></td>
        <td>${sanitizeHTML(book.author)}</td>
        <td>${sanitizeHTML(book.genre)}</td>
        <td>${sanitizeHTML(String(book.year))}</td>
        <td>
          <span class="badge ${badgeClass}">${sanitizeHTML(book.status)}</span>
        </td>
        <td>
          <button class="btn btn-action btn-edit" data-id="${book.id}">Editar</button>
          <button class="btn btn-action btn-delete" data-id="${book.id}">Excluir</button>
        </td>
      </tr>
    `;
  }).join(''); // Converte o array de strings HTML numa única string contínua.
}


// ==========================================
// SEÇÃO 9: CRIAÇÃO E EDIÇÃO DE LIVROS (SUBMISSÃO DO FORMULÁRIO)
// Envia novos dados ou atualizações para o Firestore.
// ==========================================

bookForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Impede recarregamento da página.

  // Lê o ID oculto no formulário (se existir ID, trata-se de EDIÇÃO; se estiver vazio, CRIAÇÃO).
  const id = bookIdInput.value;
  
  // Monta o objeto com as informações preenchidas pelo usuário no formulário.
  const payload = {
    title: titleInput.value.trim(),          // Remove espaços em branco desnecessários nas pontas.
    author: authorInput.value.trim(),        // Remove espaços do autor.
    genre: genreInput.value.trim(),          // Remove espaços do gênero.
    year: Number(yearInput.value),           // Converte a string de entrada para número inteiro.
    status: statusSelect.value,              // Obtém o valor selecionado ("Disponível" ou "Emprestado").
    updatedAt: serverTimestamp()             // Grava o horário de alteração direto do servidor Google.
  };

  try {
    if (id) {
      // SE existir um ID: Atualiza um documento existente no Firestore.
      const docRef = doc(db, "books", id);   // Cria referência apontando exatamente para o documento por ID.
      await updateDoc(docRef, payload);      // Envia as alterações para o Firestore.
    } else {
      // SE NÃO existir ID: Cria um novo documento na coleção.
      payload.createdAt = serverTimestamp(); // Adiciona a data/hora de criação inicial.
      await addDoc(booksCollection, payload);// Insere o novo objeto como documento no Firestore.
    }

    resetForm(); // Limpa o formulário e restaura para o modo de cadastro.
  } catch (error) {
    console.error("Erro ao salvar documento: ", error); // Exibe no console caso falhe.
    alert("Ocorreu um erro ao salvar o livro.");      // Notifica o usuário.
  }
});


// ==========================================
// SEÇÃO 10: AÇÕES DA TABELA (EDITAR E EXCLUIR)
// Delegação de eventos para gerenciar os botões dentro das linhas da tabela.
// ==========================================

booksTableBody.addEventListener("click", async (e) => {
  const target = e.target;                      // Elemento exato onde o usuário clicou.
  const id = target.getAttribute("data-id");    // Captura o ID do livro gravado no atributo `data-id`.

  if (!id) return; // Se clicou fora de um botão que contenha o ID, ignora o evento.

  // Ação ao clicar no botão "Editar"
  if (target.classList.contains("btn-edit")) {
    // Busca o objeto do livro correspondente na memória local `booksData`.
    const book = booksData.find(b => b.id === id);
    if (book) {
      // Preenche os campos do formulário com os dados existentes do livro selecionado.
      bookIdInput.value = book.id;
      titleInput.value = book.title;
      authorInput.value = book.author;
      genreInput.value = book.genre;
      yearInput.value = book.year;
      statusSelect.value = book.status;

      // Altera os títulos do formulário para indicar visualmente que está em modo de edição.
      formTitle.textContent = "Editar Livro";
      btnSubmit.textContent = "Atualizar Livro";
      btnCancel.classList.remove("hidden"); // Exibe botão de cancelar a edição.

      // Rola a página suavemente até o topo para facilitar a visualização do formulário pelo usuário.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Ação ao clicar no botão "Excluir"
  if (target.classList.contains("btn-delete")) {
    // Exibe caixa de confirmação para evitar exclusões acidentais.
    const confirmDelete = confirm("Tem certeza de que deseja remover este livro do acervo?");
    if (confirmDelete) {
      try {
        // Envia comando para excluir o documento do banco Firestore pelo seu ID.
        await deleteDoc(doc(db, "books", id));
      } catch (error) {
        console.error("Erro ao excluir livro: ", error);
        alert("Erro ao remover o livro do banco de dados.");
      }
    }
  }
});

// Limpa todos os campos do formulário e restaura a interface para o modo "Cadastrar Novo Livro".
function resetForm() {
  bookForm.reset();                          // Limpa todas as entradas digitadas.
  bookIdInput.value = "";                    // Apaga o ID oculto na memória do formulário.
  formTitle.textContent = "Cadastrar Novo Livro"; // Restaura o título do formulário.
  btnSubmit.textContent = "Salvar Livro";    // Restaura o texto do botão principal.
  btnCancel.classList.add("hidden");        // Esconde o botão de cancelar edição.
}

// Clique no botão "Cancelar Edição": Executa a função de restauração do formulário.
btnCancel.addEventListener("click", resetForm);

// Evento disparado em tempo real enquanto o usuário digita na barra de pesquisa.
searchInput.addEventListener("input", (e) => {
  currentSearchTerm = e.target.value; // Atualiza a variável de termo buscado.
  renderTable();                       // Redesenha a tabela instantaneamente filtrada.
});


// ==========================================
// SEÇÃO 11: ORDENAÇÃO DE COLUNAS
// Altera as setas indicadoras e reordena os dados exibidos.
// ==========================================

// Atualiza o visual dos ícones indicadores de ordenação nos cabeçalhos da tabela.
function updateSortIndicators() {
  const fields = ["title", "author", "year"]; // Lista dos campos que possuem ordenação.

  fields.forEach((field) => {
    const indicatorEl = document.getElementById(`indicator-${field}`); // Elemento da seta no HTML.
    if (!indicatorEl) return;

    if (currentSort.field === field) {
      // Se a coluna for a atualmente ordenada, coloca a seta correspondente e ativa a cor destacada.
      indicatorEl.textContent = currentSort.direction === "asc" ? "▲" : "▼";
      indicatorEl.classList.add("active-sort");
    } else {
      // Se a coluna não estiver sendo ordenada, coloca o ícone neutro.
      indicatorEl.textContent = "↕";
      indicatorEl.classList.remove("active-sort");
    }
  });
}

// Inverte ou altera a coluna selecionada para ordenação.
function toggleSort(field) {
  if (currentSort.field === field) {
    // Se clicou na mesma coluna, inverte a direção (ascendente <-> descendente).
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    // Se clicou numa coluna nova, altera o campo e inicia com ordem ascendente.
    currentSort.field = field;
    currentSort.direction = "asc";
  }

  updateSortIndicators(); // Atualiza a indicação visual das setas.
  renderTable();           // Redesenha a tabela ordenada.
}

// Adiciona ouvintes de clique nos botões de ordenação do cabeçalho da tabela.
sortTitleBtn.addEventListener("click", () => toggleSort("title"));
sortAuthorBtn.addEventListener("click", () => toggleSort("author"));
sortYearBtn.addEventListener("click", () => toggleSort("year"));


// ==========================================
// SEÇÃO 12: EXECUÇÃO INICIAL
// Dispara a leitura do tema assim que a página carrega.
// ==========================================
initTheme();