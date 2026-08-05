// ==========================================
// SEÇÃO 1: IMPORTAÇÕES DO FIREBASE (SDK v10)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import { 
  getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  getStorage, ref, uploadBytes, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ==========================================
// SEÇÃO 2: INICIALIZAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyDAQENqu8SpczaPmZ-njSGMOLMtcRkD6W0",
  authDomain: "bibliotech-cdd87.firebaseapp.com",
  projectId: "bibliotech-cdd87",
  storageBucket: "bibliotech-cdd87.firebasestorage.app",
  messagingSenderId: "223374026716",
  appId: "1:223374026716:web:83756b8ec083afe8331119"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Referências das Coleções
const booksCollection = collection(db, "books");
const loansCollection = collection(db, "loans");
const usersCollection = collection(db, "users");

// CONSTANTES DE NEGÓCIO
const DAILY_FINE_RATE = 2.00; // Multa diária por atraso (R$)
const DEFAULT_COVER = "https://via.placeholder.com/300x400?text=Sem+Capa";

// ==========================================
// SEÇÃO 3: ESTADO GLOBAL
// ==========================================
let booksData = [];
let loansData = [];
let currentUser = null;
let currentUserRole = "reader"; // Default RBAC
let currentSearchTerm = "";
let currentSort = { field: null, direction: "asc" };
let currentDisplayMode = "gallery"; // 'gallery' ou 'table'

let unsubscribeBooks = null;
let unsubscribeLoans = null;

// ==========================================
// SEÇÃO 4: CAPTURA DO DOM
// ==========================================
const widgetDate = document.getElementById("widget-date");
const widgetTime = document.getElementById("widget-time");
const themeToggleBtn = document.getElementById("theme-toggle");
const themeIcon = document.getElementById("theme-icon");

const authSection = document.getElementById("auth-section");
const appContent = document.getElementById("app-content");
const btnLogout = document.getElementById("btn-logout");
const userRoleBadge = document.getElementById("user-role-badge");

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

const navTabBooks = document.getElementById("nav-tab-books");
const navTabLoans = document.getElementById("nav-tab-loans");
const viewBooks = document.getElementById("view-books");
const viewLoans = document.getElementById("view-loans");

const bookForm = document.getElementById("book-form");
const bookFormSection = document.getElementById("book-form-section");
const bookIdInput = document.getElementById("book-id");
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const genreInput = document.getElementById("genre");
const yearInput = document.getElementById("year");
const statusSelect = document.getElementById("status");
const coverFileInput = document.getElementById("cover-image");
const formTitle = document.getElementById("form-title");
const btnSubmit = document.getElementById("btn-submit");
const btnCancel = document.getElementById("btn-cancel");

const searchInput = document.getElementById("search-input");
const booksGalleryContainer = document.getElementById("books-gallery-container");
const booksTableContainer = document.getElementById("books-table-container");
const booksTableBody = document.getElementById("books-table-body");
const toggleGalleryBtn = document.getElementById("toggle-gallery-view");
const toggleTableBtn = document.getElementById("toggle-table-view");

const loanForm = document.getElementById("loan-form");
const loanBookSelect = document.getElementById("loan-book-select");
const loanStudentName = document.getElementById("loan-student-name");
const loanStudentEmail = document.getElementById("loan-student-email");
const loanDueDate = document.getElementById("loan-due-date");
const loansTableBody = document.getElementById("loans-table-body");

const statTotal = document.getElementById("stat-total");
const statDisponivel = document.getElementById("stat-disponivel");
const statEmprestado = document.getElementById("stat-emprestado");
const statMultas = document.getElementById("stat-multas");

// ==========================================
// SEÇÃO 5: AUXILIARES & TEMPO REAL (HORA)
// ==========================================
function updateClock() {
  const now = new Date();
  widgetDate.textContent = now.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  widgetTime.textContent = now.toLocaleTimeString('pt-BR');
}
setInterval(updateClock, 1000);
updateClock();

function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str || '';
  return temp.innerHTML;
}

// ==========================================
// SEÇÃO 6: GERENCIAMENTO DE TEMAS
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeIcon.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  themeIcon.textContent = newTheme === "dark" ? "☀️" : "🌙";
});

// ==========================================
// SEÇÃO 7: AUTENTICAÇÃO E RBAC
// ==========================================
tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active"); tabRegister.classList.remove("active");
  loginForm.classList.remove("hidden"); registerForm.classList.add("hidden");
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active"); tabLogin.classList.remove("active");
  registerForm.classList.remove("hidden"); loginForm.classList.add("hidden");
});

// Registro de usuário gravando o perfil (Role) na coleção /users
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Salva a Role no Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      role: role,
      createdAt: serverTimestamp()
    });

    alert("Conta cadastrada com sucesso!");
    registerForm.reset();
  } catch (error) {
    console.error("Erro ao registrar:", error);
    alert("Erro no cadastro: " + error.message);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
  } catch (error) {
    alert("Falha na autenticação: Usuário ou senha incorretos.");
  }
});

btnLogout.addEventListener("click", () => signOut(auth));

// Observador Auth + Carregamento do Perfil RBAC
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authSection.classList.add("hidden");
    appContent.classList.remove("hidden");
    btnLogout.classList.remove("hidden");
    userRoleBadge.classList.remove("hidden");

    // Busca Perfil RBAC no Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      currentUserRole = userDoc.data().role || "reader";
    } else {
      currentUserRole = "reader";
    }

    applyRBACUI();
    initRealtimeListeners();
  } else {
    currentUser = null;
    currentUserRole = "reader";
    authSection.classList.remove("hidden");
    appContent.classList.add("hidden");
    btnLogout.classList.add("hidden");
    userRoleBadge.classList.add("hidden");

    if (unsubscribeBooks) unsubscribeBooks();
    if (unsubscribeLoans) unsubscribeLoans();
    booksData = []; loansData = [];
  }
});

// Ajusta a Interface do Usuário conforme a permissão (RBAC)
function applyRBACUI() {
  userRoleBadge.textContent = currentUserRole === "admin" ? "Perfil: Administrador" : "Perfil: Leitor";
  
  const adminElements = document.querySelectorAll(".admin-only");
  adminElements.forEach(el => {
    if (currentUserRole === "admin") {
      el.classList.remove("hidden");
    } else {
      el.classList.add("hidden");
    }
  });

  // Reajusta a largura do layout da galeria caso o formulário esteja oculto para Leitores
  if (currentUserRole !== "admin") {
    document.querySelector("#view-books .app-layout").classList.add("full-width-layout");
  } else {
    document.querySelector("#view-books .app-layout").classList.remove("full-width-layout");
  }
}

// ==========================================
// SEÇÃO 8: SINCRONIZAÇÃO EM TEMPO REAL
// ==========================================
function initRealtimeListeners() {
  // Ouvinte /books
  unsubscribeBooks = onSnapshot(booksCollection, (snapshot) => {
    booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateDashboard();
    renderBooksView();
    populateLoanBookSelect();
  });

  // Ouvinte /loans
  unsubscribeLoans = onSnapshot(loansCollection, (snapshot) => {
    loansData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateDashboard();
    renderLoansTable();
  });
}

// Preenche o Select do formulário de empréstimos apenas com livros "Disponíveis"
function populateLoanBookSelect() {
  const availableBooks = booksData.filter(b => b.status === "Disponível");
  loanBookSelect.innerHTML = '<option value="">Selecione um livro...</option>' + 
    availableBooks.map(b => `<option value="${b.id}">${sanitizeHTML(b.title)} - ${sanitizeHTML(b.author)}</option>`).join('');
}

// ==========================================
// SEÇÃO 9: DASHBOARD & CÁLCULO DE MULTAS
// ==========================================
function calculateFine(dueDateStr, status) {
  if (status === "Devolvido") return 0;
  
  const dueDate = new Date(dueDateStr + "T23:59:59");
  const today = new Date();

  if (today > dueDate) {
    const diffTime = Math.abs(today - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays * DAILY_FINE_RATE;
  }
  return 0;
}

function updateDashboard() {
  const total = booksData.length;
  const disponiveis = booksData.filter(b => b.status === "Disponível").length;
  const emprestados = booksData.filter(b => b.status === "Emprestado").length;

  let totalFines = 0;
  loansData.forEach(loan => {
    totalFines += calculateFine(loan.dueDate, loan.status);
  });

  statTotal.textContent = total;
  statDisponivel.textContent = disponiveis;
  statEmprestado.textContent = emprestados;
  statMultas.textContent = totalFines.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ==========================================
// SEÇÃO 10: RENDERIZAÇÃO DO ACERVO (GALERIA / TABELA)
// ==========================================
function renderBooksView() {
  let filtered = booksData.filter(book => {
    const term = currentSearchTerm.toLowerCase();
    return (book.title && book.title.toLowerCase().includes(term)) ||
           (book.author && book.author.toLowerCase().includes(term));
  });

  if (currentSort.field) {
    filtered.sort((a, b) => {
      let fieldA = a[currentSort.field] || '';
      let fieldB = b[currentSort.field] || '';
      if (typeof fieldA === 'string') fieldA = fieldA.toLowerCase();
      if (typeof fieldB === 'string') fieldB = fieldB.toLowerCase();
      if (fieldA < fieldB) return currentSort.direction === "asc" ? -1 : 1;
      if (fieldA > fieldB) return currentSort.direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  renderGallery(filtered);
  renderTable(filtered);
}

// Renderiza MODO GALERIA
function renderGallery(books) {
  if (books.length === 0) {
    booksGalleryContainer.innerHTML = `<div class="table-empty" style="grid-column: 1/-1;">Nenhum livro encontrado no acervo.</div>`;
    return;
  }

  booksGalleryContainer.innerHTML = books.map(book => {
    const badgeClass = book.status === "Disponível" ? "badge-disponivel" : "badge-emprestado";
    const coverUrl = book.coverUrl || DEFAULT_COVER;

    return `
      <div class="book-card">
        <img src="${coverUrl}" alt="Capa de ${sanitizeHTML(book.title)}" class="book-card-cover" loading="lazy">
        <div class="book-card-body">
          <h3 class="book-card-title">${sanitizeHTML(book.title)}</h3>
          <p class="book-card-author">${sanitizeHTML(book.author)}</p>
          <div class="book-card-meta">
            <span>Gênero: <strong>${sanitizeHTML(book.genre)}</strong></span>
            <span>Ano: <strong>${sanitizeHTML(String(book.year))}</strong></span>
          </div>
          <div style="margin-bottom: 0.5rem;">
            <span class="badge ${badgeClass}">${sanitizeHTML(book.status)}</span>
          </div>
          ${currentUserRole === "admin" ? `
            <div class="book-card-actions">
              <button class="btn btn-action btn-edit" data-id="${book.id}">Editar</button>
              <button class="btn btn-action btn-delete" data-id="${book.id}">Excluir</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Renderiza MODO TABELA
function renderTable(books) {
  if (books.length === 0) {
    booksTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhum livro encontrado.</td></tr>`;
    return;
  }

  booksTableBody.innerHTML = books.map(book => {
    const badgeClass = book.status === "Disponível" ? "badge-disponivel" : "badge-emprestado";
    const coverUrl = book.coverUrl || DEFAULT_COVER;

    return `
      <tr>
        <td><img src="${coverUrl}" class="table-thumb" alt="Thumb"></td>
        <td><strong>${sanitizeHTML(book.title)}</strong></td>
        <td>${sanitizeHTML(book.author)}</td>
        <td>${sanitizeHTML(book.genre)}</td>
        <td>${sanitizeHTML(String(book.year))}</td>
        <td><span class="badge ${badgeClass}">${sanitizeHTML(book.status)}</span></td>
        ${currentUserRole === "admin" ? `
          <td>
            <button class="btn btn-action btn-edit" data-id="${book.id}">Editar</button>
            <button class="btn btn-action btn-delete" data-id="${book.id}">Excluir</button>
          </td>
        ` : '<td class="hidden"></td>'}
      </tr>
    `;
  }).join('');
}

// Alternadores de Modo Galeria/Tabela
toggleGalleryBtn.addEventListener("click", () => {
  currentDisplayMode = "gallery";
  toggleGalleryBtn.classList.add("active");
  toggleTableBtn.classList.remove("active");
  booksGalleryContainer.classList.remove("hidden");
  booksTableContainer.classList.add("hidden");
});

toggleTableBtn.addEventListener("click", () => {
  currentDisplayMode = "table";
  toggleTableBtn.classList.add("active");
  toggleGalleryBtn.classList.remove("active");
  booksTableContainer.classList.remove("hidden");
  booksGalleryContainer.classList.add("hidden");
});

// ==========================================
// SEÇÃO 11: CRUD DE LIVROS + FIREBASE STORAGE
// ==========================================
bookForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (currentUserRole !== "admin") return alert("Ação não permitida para seu perfil.");

  const id = bookIdInput.value;
  const file = coverFileInput.files[0];
  let coverUrl = null;

  try {
    // Processa Upload de Imagem no Storage se um arquivo for selecionado
    if (file) {
      const storageRef = ref(storage, `covers/${Date.now()}_${file.name}`);
      const uploadTask = await uploadBytes(storageRef, file);
      coverUrl = await getDownloadURL(uploadTask.ref);
    }

    const payload = {
      title: titleInput.value.trim(),
      author: authorInput.value.trim(),
      genre: genreInput.value.trim(),
      year: Number(yearInput.value),
      status: statusSelect.value,
      updatedAt: serverTimestamp()
    };

    if (coverUrl) payload.coverUrl = coverUrl;

    if (id) {
      await updateDoc(doc(db, "books", id), payload);
    } else {
      payload.createdAt = serverTimestamp();
      if (!payload.coverUrl) payload.coverUrl = DEFAULT_COVER;
      await addDoc(booksCollection, payload);
    }

    resetBookForm();
  } catch (error) {
    console.error("Erro ao salvar livro:", error);
    alert("Erro ao salvar o livro no banco de dados.");
  }
});

// Eventos de Ação (Delegados) na Galeria e na Tabela de Livros
[booksGalleryContainer, booksTableBody].forEach(element => {
  element.addEventListener("click", async (e) => {
    const target = e.target;
    const id = target.getAttribute("data-id");
    if (!id || currentUserRole !== "admin") return;

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

    if (target.classList.contains("btn-delete")) {
      if (confirm("Deseja realmente remover este livro do acervo?")) {
        await deleteDoc(doc(db, "books", id));
      }
    }
  });
});

function resetBookForm() {
  bookForm.reset();
  bookIdInput.value = "";
  formTitle.textContent = "Cadastrar Novo Livro";
  btnSubmit.textContent = "Salvar Livro";
  btnCancel.classList.add("hidden");
}
btnCancel.addEventListener("click", resetBookForm);

searchInput.addEventListener("input", (e) => {
  currentSearchTerm = e.target.value;
  renderBooksView();
});

// ==========================================
// SEÇÃO 12: REGISTRO E GESTÃO DE EMPRÉSTIMOS (/loans)
// ==========================================
loanForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (currentUserRole !== "admin") return alert("Ação não permitida para seu perfil.");

  const bookId = loanBookSelect.value;
  const selectedBook = booksData.find(b => b.id === bookId);

  if (!selectedBook) return alert("Selecione um livro válido.");

  const payload = {
    bookId: selectedBook.id,
    bookTitle: selectedBook.title,
    studentName: loanStudentName.value.trim(),
    studentEmail: loanStudentEmail.value.trim(),
    borrowedAt: new Date().toISOString().split('T')[0],
    dueDate: loanDueDate.value,
    status: "Ativo",
    createdAt: serverTimestamp()
  };

  try {
    // 1. Cria o registro de empréstimo na coleção /loans
    await addDoc(loansCollection, payload);

    // 2. Atualiza o status do livro para "Emprestado" na coleção /books
    await updateDoc(doc(db, "books", selectedBook.id), { status: "Emprestado" });

    alert("Empréstimo registrado com sucesso!");
    loanForm.reset();
  } catch (error) {
    console.error("Erro ao registrar empréstimo:", error);
    alert("Falha ao registrar empréstimo.");
  }
});

// Renderiza a Tabela de Empréstimos
function renderLoansTable() {
  if (loansData.length === 0) {
    loansTableBody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhum empréstimo registrado.</td></tr>`;
    return;
  }

  loansTableBody.innerHTML = loansData.map(loan => {
    const fine = calculateFine(loan.dueDate, loan.status);
    const isLate = fine > 0;
    
    let statusBadge = `<span class="badge badge-disponivel">Devolvido</span>`;
    if (loan.status === "Ativo") {
      statusBadge = isLate 
        ? `<span class="badge badge-atrasado">Em Atraso</span>` 
        : `<span class="badge badge-emprestado">Em Dia</span>`;
    }

    return `
      <tr>
        <td><strong>${sanitizeHTML(loan.bookTitle)}</strong></td>
        <td>${sanitizeHTML(loan.studentName)} (${sanitizeHTML(loan.studentEmail)})</td>
        <td>${sanitizeHTML(loan.borrowedAt)}</td>
        <td>${sanitizeHTML(loan.dueDate)}</td>
        <td>${statusBadge}</td>
        <td style="color: ${isLate ? 'var(--danger-color)' : 'inherit'}; font-weight: ${isLate ? 'bold' : 'normal'};">
          ${fine.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </td>
        ${currentUserRole === "admin" ? `
          <td>
            ${loan.status === "Ativo" ? `
              <button class="btn btn-action btn-return" data-id="${loan.id}" data-bookid="${loan.bookId}">Dar Baixa (Devolver)</button>
            ` : '---'}
          </td>
        ` : '<td class="hidden"></td>'}
      </tr>
    `;
  }).join('');
}

// Processa a Devolução de Livro (Dar Baixa)
loansTableBody.addEventListener("click", async (e) => {
  const target = e.target;
  if (!target.classList.contains("btn-return") || currentUserRole !== "admin") return;

  const loanId = target.getAttribute("data-id");
  const bookId = target.getAttribute("data-bookid");

  if (confirm("Confirmar a devolução deste livro?")) {
    try {
      // 1. Atualiza empréstimo em /loans para Devolvido
      await updateDoc(doc(db, "loans", loanId), {
        status: "Devolvido",
        returnedAt: new Date().toISOString().split('T')[0]
      });

      // 2. Libera o livro em /books tornando-o Disponível
      await updateDoc(doc(db, "books", bookId), { status: "Disponível" });

      alert("Devolução concluída e acervo atualizado!");
    } catch (error) {
      console.error("Erro na devolução:", error);
      alert("Erro ao processar devolução.");
    }
  }
});

// Navegação entre as Abas (Acervo vs Empréstimos)
navTabBooks.addEventListener("click", () => {
  navTabBooks.classList.add("active"); navTabLoans.classList.remove("active");
  viewBooks.classList.remove("hidden"); viewLoans.classList.add("hidden");
});

navTabLoans.addEventListener("click", () => {
  navTabLoans.classList.add("active"); navTabBooks.classList.remove("active");
  viewLoans.classList.remove("hidden"); viewBooks.classList.add("hidden");
});

// Inicialização
initTheme();