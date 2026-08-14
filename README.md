# ARP - Frontend

Sistema de Administração de Atas de Registro de Preço (ARP) - Interface Frontend.

## 📋 Sobre o Projeto

Este é o frontend do sistema de administração de atas de registro de preço, desenvolvido em **Angular 21 LTS**. Ele fornece uma interface moderna e intuitiva para gerenciar secretarias, servidores, atas e equipes de contrato.

### Funcionalidades

- **Dashboard**: Visão geral com métricas e gráficos
- **Secretarias**: CRUD completo de secretarias
- **Servidores**: CRUD completo de servidores
- **Atas**: Criação, listagem e exclusão de atas
- **Equipes de Contrato**: Criação, listagem e exclusão de equipes

### Tecnologias

- **Framework**: Angular 21 LTS
- **Linguagem**: TypeScript
- **Estilização**: SCSS
- **UI Components**: PrimeNG
- **Gráficos**: Chart.js
- **Máscaras**: ngx-mask
- **Notificações**: Angular Toastr

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js (versão 20 ou superior)
- Angular CLI
- Backend rodando em `http://localhost:8081/api`

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/arp-frontend.git
cd arp-frontend

# Instale as dependências
npm install
```

### Executar em desenvolvimento

```bash
ng serve
```

A aplicação estará disponível em: `http://localhost:4200`

### Build para produção

```bash
ng build
```

Os arquivos gerados estarão na pasta `dist/`.

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── core/
│   │   ├── interceptors/      # HTTP interceptors
│   │   ├── services/          # API services
│   │   └── models/            # TypeScript interfaces
│   ├── shared/
│   │   ├── components/        # Reusable components
│   │   ├── directives/        # Custom directives
│   │   ├── pipes/             # Formatting pipes
│   │   └── validators/        # Custom validators
│   └── features/
│       ├── dashboard/         # Dashboard page
│       ├── secretarias/       # Secretariats CRUD
│       ├── servidores/        # Servants CRUD
│       ├── atas/              # Agreements CRUD
│       └── equipes/           # Contract Teams CRUD
├── assets/
│   └── styles/
│       ├── variables.scss
│       ├── mixins.scss
│       └── global.scss
├── environments/
│   ├── environment.ts         # Development environment
│   └── environment.prod.ts    # Production environment
└── index.html
```

---

## 🔗 Integração com a API

### Configuração

A URL da API é configurada no arquivo `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081/api'
};
```

### Endpoints

| Recurso | Método | Endpoint |
|---------|--------|----------|
| Secretarias | GET | `/api/secretarias` |
| Secretarias | POST | `/api/secretarias` |
| Secretarias | PUT | `/api/secretarias/{id}` |
| Secretarias | DELETE | `/api/secretarias/{id}` |
| Servidores | GET | `/api/servidores` |
| Servidores | POST | `/api/servidores` |
| Servidores | PUT | `/api/servidores/{id}` |
| Servidores | DELETE | `/api/servidores/{id}` |
| Atas | GET | `/api/atas` |
| Atas | POST | `/api/atas` |
| Atas | DELETE | `/api/atas/{id}` |
| Equipes | GET | `/api/equipes-contrato` |
| Equipes | POST | `/api/equipes-contrato` |
| Equipes | DELETE | `/api/equipes-contrato/{id}` |

---

## 🎨 Paleta de Cores

| Cor | Uso |
|-----|-----|
| `#1e293b` | Sidebar e header |
| `#0f172a` | Elementos de destaque |
| `#3b82f6` | Botões principais |
| `#22c55e` | Status "Ativo" |
| `#ef4444` | Status "Desativado" e exclusão |
| `#f59e0b` | Status "Pendente" |
| `#f1f5f9` | Fundo da página |
| `#ffffff` | Cards e containers |

---

## 📋 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `ng serve` | Roda em desenvolvimento |
| `ng build` | Gera build de produção |
| `ng test` | Roda testes unitários |
| `ng lint` | Verifica código com ESLint |

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas alterações (`git commit -m 'feat: nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é de uso interno e confidencial.

---

## 📞 Contato

Para dúvidas ou sugestões, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com Angular 21 LTS** 🚀
