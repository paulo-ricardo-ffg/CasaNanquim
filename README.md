# 🖋️ Casa Nanquim — Site Oficial

O **Casa Nanquim** é um site institucional de alta performance desenvolvido para um estúdio de tatuagem. O foco principal foi criar uma experiência de usuário (UX) fluida, aliando a estética artística do nanquim à funcionalidade técnica de agendamentos online.

🔗 **Acesse o projeto online:** [Clique aqui para visitar](https://paulo-ricardo-ffg.github.io/CasaNanquim/)

---

## 📌 Sobre o Projeto

Este projeto foi construído para servir como a vitrine digital do estúdio, permitindo que clientes conheçam o trabalho dos artistas e realizem pré-agendamentos de forma automatizada.

### 🌟 Diferenciais
* **Performance:** Carregamento otimizado de imagens para o portfólio.
* **Serverless Backend:** Utilização criativa do Google Sheets como banco de dados, eliminando custos de infraestrutura.
* **Admin Panel:** Área restrita para gestão de leads e controle de horários.

---

## ⚙️ Funcionalidades

### 🖥️ Frontend (Client Side)
* **Design One-Page:** Navegação intuitiva e fluida sem recarregamento de página.
* **Portfólio Dinâmico:** Galeria categorizada por estilos de tatuagem.
* **Formulário Inteligente:** Validação de dados em tempo real antes do envio.
* **Totalmente Responsivo:** Experiência otimizada para smartphones, tablets e desktops via Bootstrap 5.

### 🛠️ Painel Administrativo & Backend
* **Integração Google Apps Script:** O script atua como uma API intermediária que processa requisições `POST` (envio) e `GET` (leitura).
* **Gestão de Dados:** Interface administrativa para visualização centralizada dos agendamentos salvos na planilha.

---

## 🚀 Tecnologias Utilizadas

* **Linguagens:** HTML5, CSS3 (Custom Properties), JavaScript (ES6+).
* **Framework CSS:** [Bootstrap 5](https://getbootstrap.com/).
* **Backend & DB:** [Google Apps Script](https://developers.google.com/apps-script) integrado ao Google Sheets.

---

## 📂 Estrutura de Arquivos

```bash
/casa-nanquim
├── index.html          # Landing page principal
├── admin.html          # Painel de gestão administrativa
├── /css
│   ├── style.css       # Estilização visual da vitrine
│   └── admin.css       # Layout do dashboard administrativo
├── /js
│   ├── script.js       # Lógica do formulário e interações UX
│   └── admin.js        # Consumo da API do Google e renderização de dados
└── /img                # Assets, logo e imagens do portfólio
