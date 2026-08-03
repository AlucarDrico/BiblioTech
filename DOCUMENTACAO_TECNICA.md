# Documentação Técnica e Arquitetural — BiblioTech 📚

---

## 1. Visão Geral do Projeto

O **BiblioTech** é uma aplicação web completa (*Full Stack / Serverless*) voltada para a gestão e controle de acervos bibliográficos, ideal para ambientes escolares, acadêmicos e comunitários. 

O sistema implementa o padrão **Single Page Application (SPA)**, operando de forma 100% dinâmica no lado do cliente (*Client-Side Rendering* - CSR) em integração direta com a plataforma Google Firebase v10+ (SDK Modular).

### Principais Objetivos:
*   **Gerenciamento do Acervo (CRUD Completo):** Cadastro, listagem, atualização e remoção de obras literárias.
*   **Sincronização em Tempo Real:** Atualizações instantâneas no dashboard e na tabela via protocolo WebSocket e streams de dados do Firestore.
*   **Autenticação e Segurança:** Controle de acesso por e-mail e senha, garantindo visibilidade e ação apenas para usuários autenticados.
*   **Acessibilidade e Experiência do Usuário (UX):** Suporte nativo a temas Claro/Escuro (Dark Mode) com persistência local, ordenação dinâmica, busca em tempo real e visualização de métricas instantâneas.

---

## 2. Arquitetura do Sistema e Stack Tecnológica

A arquitetura adota a abordagem **Serverless**, eliminando a necessidade de gerenciamento de servidores ou APIs intermediárias tradicionais (Node.js/Express). A camada de apresentação (Frontend) conecta-se de forma direta e segura às APIs de nuvem do Firebase.

```
+-----------------------------------------------------------------------+
|                             NAVEGADOR                                 |
|                                                                       |
|   +-------------------+  +------------------+  +-------------------+  |
|   |   HTML5 Semantic  |  |  CSS3 Variables  |  | JS ES6+ Modules   |  |
|   |    (Estrutura)    |  |  (Design System) |  |   (Lógica/DOM)    |  |
|   +-------------------+  +------------------+  +-------------------+  |
|                                     |                                 |
+-------------------------------------|---------------------------------+
                                      | Protocolos HTTP/2 & WebSockets
                                      v
+-----------------------------------------------------------------------+
|                           GOOGLE FIREBASE                             |
|                                                                       |
|   +-------------------+  +------------------+  +-------------------+  |
|   | Firebase Auth     |  | Firestore Database| | Firebase Hosting  |  |
|   | (Identity Engine) |  | (NoSQL Document) |  |  (CDN Edge Web)   |  |
|   +-------------------+  +------------------+  +-------------------+  |
+-----------------------------------------------------------------------+
```

### Tecnologias Utilizadas:
1. **Frontend:**
   * **HTML5:** Marcação semântica com foco em acessibilidade e estrutura limpa.
   * **CSS3:** Estilização responsiva com Flexbox, CSS Grid, variáveis customizadas (*Custom Properties*) para troca de temas, e transições suaves.
   * **JavaScript (ES6+ / ES Modules):** Uso do padrão modular Nativo do navegador (`import` / `export`), eliminando a necessidade obrigatória de ferramentas de bundling (WebPack/Vite) para desenvolvimento rápido.
2. **Backend & Cloud (Firebase v10 Modular SDK):**
   * **Firebase Authentication:** Gestão segura de sessões e contas de usuários.
   * **Cloud Firestore:** Banco de dados NoSQL orientado a documentos com suporte nativo a observadores em tempo real (*Realtime Observers*).

---

## 3. Glossário de Termos Técnicos

* **SPA (Single Page Application):** Aplicação web que carrega uma única página HTML e atualiza dinamicamente o conteúdo conforme o usuário interage.
* **SDK Modular (Tree-Shakable):** Estrutura do SDK do Firebase v10 que permite importar apenas as funções utilizadas, reduzindo o tamanho final do arquivo transferido pela rede.
* **NoSQL Document Database:** Banco de dados que organiza dados em coleções (*Collections*) e documentos (*Documents*) em vez de tabelas e linhas tradicionais.
* **Observer Pattern (Padrão Observador):** Padrão de projeto em que uma função do código "escuta" e reage a mudanças na base de dados em tempo real (`onSnapshot`).
* **DOM Sanitization:** Processo de limpeza de entrada de dados do usuário para prevenir injeção de scripts maliciosos (XSS).
* **LocalStorage:** Armazenamento chave-valor direto no navegador do usuário, utilizado para salvar preferências como o tema selecionado.

---

## 4. Recursos e Funcionalidades do Sistema

### 4.1. Autenticação e Controle de Acesso
* **Criar Conta / Login:** Validação básica e integração com `createUserWithEmailAndPassword` e `signInWithEmailAndPassword`.
* **Persistência de Sessão:** O ouvinte `onAuthStateChanged` verifica o estado da sessão ao carregar a página e oculta/exibe a interface adequada.
* **Logout:** Encerramento seguro de sessão e destruição do ouvinte de dados ativos para evitar vazamento de dados.

### 4.2. Dashboard de Métricas
* Exibição de estatísticas recalculadas dinamicamente:
  * **Total no Acervo:** Quantidade geral de livros.
  * **Disponíveis:** Quantidade de obras prontas para empréstimo.
  * **Emprestados:** Quantidade de livros atualmente em posse de leitores.

### 4.3. Gerenciamento do Acervo (CRUD)
* **Create:** Adiciona novos documentos com carimbo de data/hora oficial do servidor (`serverTimestamp`).
* **Read:** Escuta a coleção `books` em tempo real.
* **Update:** Reaproveita o formulário de cadastro para edição, enviando os dados modificados pelo ID do documento.
* **Delete:** Confirmação prévia e remoção imediata do registro no banco NoSQL.

### 4.4. Recursos de Busca, Filtro e Ordenação
* **Filtro / Busca Global:** Busca instantânea no lado do cliente nos campos de *Título* e *Autor*, tolerante a maiúsculas/minúsculas (*case-insensitive*).
* **Ordenação Colunar:** Alternância de ordem crescente e decrescente por *Título*, *Autor* e *Ano de Publicação* com indicação visual de setas (`▲`, `▼`, `↕`).

### 4.5. Sistema de Design e Temas
* Suporte nativo a **Light Mode** e **Dark Mode**.
* Salva automaticamente a preferência no `localStorage`.
* Animações suaves de transição CSS em propriedades de background e texto.

---

## 5. Estrutura de Dados (Cloud Firestore)

Os dados são armazenados na coleção `/books`. Cada documento segue a seguinte estrutura JSON/NoSQL:

```json
{
  "id": "abc123XYZ_generated_id",
  "title": "Dom Casmurro",
  "author": "Machado de Assis",
  "genre": "Romance / Literatura Brasileira",
  "year": 1899,
  "status": "Disponível",
  "createdAt": "2026-08-03T11:00:00Z (Timestamp)",
  "updatedAt": "2026-08-03T11:00:00Z (Timestamp)"
}
```

---

## 6. Possibilidades de Extensão e Escalabilidade Futura

Como um sistema modular bem construído, o **BiblioTech** possui potencial para a implementação de novos recursos avançados:

1. **Gestão do Histórico de Empréstimos:**
   * Criar uma coleção `/loans` para registrar qual usuário/aluno retirou o livro, data de devolução e multas/atrasos.
2. **Upload da Capa dos Livros (Firebase Storage):**
   * Permitir que o usuário envie imagens da capa das obras e as exiba na tabela ou em formato de cards (Galeria).
3. **Leitura de Código de Barras / ISBN (API Externa):**
   * Integração com a API do Google Books ou Open Library para auto-completar dados do livro ao digitar/escanear o código ISBN.
4. **Regras de Segurança Avançadas (Firestore Rules):**
   * Configurar perfis de acesso (*RBAC - Role-Based Access Control*): Leitores (somente leitura) e Administradores/Bibliotecários (CRUD total).
5. **PWA (Progressive Web App):**
   * Adicionar Service Workers para permitir o uso da aplicação offline em bibliotecas com instabilidade de internet.

---
*Documentação gerada automaticamente para o projeto BiblioTech.*
