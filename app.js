// Importações SDK Modular Firebase v10+
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Credenciais Fornecidas
const firebaseConfig = {
  apiKey: "AIzaSyDAQENqu8SpczaPmZ-njSGMOLMtcRkD6W0",
  authDomain: "bibliotech-cdd87.firebaseapp.com",
  projectId: "bibliotech-cdd87",
  storageBucket: "bibliotech-cdd87.firebasestorage.app",
  messagingSenderId: "223374026716",
  appId: "1:223374026716:web:83756b8ec083afe8331119"
};

// Inicialização Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const booksCollection = collection(db, "books");

// Estado Local da Aplicação
let booksData = [];
let currentSearchTerm = "";
let currentSort = { field: null, direction: "asc" };

// Referências de Elementos do DOM
const bookForm = document.getElementById("book-form");
const bookIdInput = document.getElementById("book-id");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const genreInput = document.getElementById("genre");
const yearInput = document.getElementById("year");
const statusSelect = document.getElementById("status");

const formTitle = document.getElementById("form-title");
const btnSubmit = document.getElementById("btn-submit");
const btnCancel = document.getElementById("btn-cancel");

const searchInput = document.getElementById("search-input");
const booksTableBody = document.getElementById("books-table-body");

const statTotal = document.getElementById("stat-total");
const statDisponivel = document.getElementById("stat-disponivel");
const statEmprestado = document.getElementById("stat-emprestado");

const sortTitleBtn = document.getElementById("sort-title");
const sortYearBtn = document.getElementById("sort-year");

// --- Funcionalidades Principais ---

// Sanitização Visual contra Injeção de Código (XSS)
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Escutar atualizações do Firestore em Tempo Real (READ / onSnapshot)
function initRealtimeListener() {
  onSnapshot(booksCollection, (snapshot) => {
    booksData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    updateDashboardStats();
    renderTable();
  }, (error) => {
    console.error("Erro ao sincronizar com Firestore: ", error);
    alert("Falha na sincronização dos dados em tempo real.");
  });
}

// Atualizar Indicadores (Extras)
function updateDashboardStats() {
  const total = booksData.length;
  const disponiveis = booksData.filter(b => b.status === "Disponível").length;
  const emprestados = booksData.filter(b => b.status === "Emprestado").length;

  statTotal.textContent = total;
  statDisponivel.textContent = disponiveis;
  statEmprestado.textContent = emprestados;
}

// Renderização da Tabela com Filtros e Ordenação
function renderTable() {
  // 1. Filtragem Local
  let filtered = booksData.filter(book => {
    const term = currentSearchTerm.toLowerCase();
    const titleMatch = book.title ? book.title.toLowerCase().includes(term) : false;
    const authorMatch = book.author ? book.author.toLowerCase().includes(term) : false;
    return titleMatch || authorMatch;
  });

  // 2. Ordenação Local (Extras)
  if (currentSort.field) {
    filtered.sort((a, b) => {
      let fieldA = a[currentSort.field];
      let fieldB = b[currentSort.field];

      if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
      if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();

      if (fieldA < fieldB) return currentSort.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return currentSort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  // 3. Renderização HTML
  if (filtered.length === 0) {
    booksTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty">Nenhum livro encontrado.</td>
      </tr>
    `;
    return;
  }

  booksTableBody.innerHTML = filtered.map(book => {
    const badgeClass = book.status === "Disponível" ? "badge-disponivel" : "badge-emprestado";
    
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
  }).join('');
}

// Operações CRUD (CREATE / UPDATE)
bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = bookIdInput.value;
  const payload = {
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    genre: genreInput.value.trim(),
    year: Number(yearInput.value),
    status: statusSelect.value,
    updatedAt: serverTimestamp()
  };

  try {
    if (id) {
      // UPDATE
      const docRef = doc(db, "books", id);
      await updateDoc(docRef, payload);
    } else {
      // CREATE
      payload.createdAt = serverTimestamp();
      await addDoc(booksCollection, payload);
    }

    resetForm();
  } catch (error) {
    console.error("Erro ao salvar documento: ", error);
    alert("Ocorreu um erro ao salvar o livro.");
  }
});

// Ações na Tabela (EDIT / DELETE) via Event Delegation
booksTableBody.addEventListener("click", async (e) => {
  const target = e.target;
  const id = target.getAttribute("data-id");

  if (!id) return;

  // Carregar para Edição
  if (target.classList.contains("btn-edit")) {
    const book = booksData.find(b => b.id === id);
    if (book) {
      bookIdInput.value = book.id;
      titleInput.value = book.title;
      authorInput.value = book.author;
      genreInput.value = book.genre;
      yearInput.value = book.year;
      statusSelect.value = book.status;

      formTitle.textContent = "Editar Livro";
      btnSubmit.textContent = "Atualizar Livro";
      btnCancel.classList.remove("hidden");

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // DELETE
  if (target.classList.contains("btn-delete")) {
    const confirmDelete = confirm("Tem certeza de que deseja remover este livro do acervo?");
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, "books", id));
      } catch (error) {
        console.error("Erro ao excluir livro: ", error);
        alert("Erro ao remover o livro do banco de dados.");
      }
    }
  }
});

// Restaurar Estado do Formulário
function resetForm() {
  bookForm.reset();
  bookIdInput.value = "";
  formTitle.textContent = "Cadastrar Novo Livro";
  btnSubmit.textContent = "Salvar Livro";
  btnCancel.classList.add("hidden");
}

btnCancel.addEventListener("click", resetForm);

// Evento de Busca Local Dinâmica (input)
searchInput.addEventListener("input", (e) => {
  currentSearchTerm = e.target.value;
  renderTable();
});

// Lógica de Ordenação (Extras)
function toggleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort.field = field;
    currentSort.direction = "asc";
  }
  renderTable();
}

sortTitleBtn.addEventListener("click", () => toggleSort("title"));
sortYearBtn.addEventListener("click", () => toggleSort("year"));

// Inicialização da Aplicação
initRealtimeListener();