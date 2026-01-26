# 👮‍♂️ PMES - Gestão de Escalas & ISEO

Sistema desenvolvido para gerenciamento de escalas mensais e ISEO. Foco em performance, self-hosting e arquitetura leve para rodar em hardware ARM (Orange Pi).

## 🏗️ Arquitetura

O sistema roda atrás de um Cloudflare Tunnel, eliminando necessidade de abrir portas no roteador.

```mermaid
graph TD
    User((Usuário)) -->|HTTPS| CF[Cloudflare Edge]
    CF -->|Tunnel| OPI[Orange Pi 5]
    
    subgraph OPI [Docker Host]
        Tun[cloudflared] -->|http| Nginx[Nginx :80]
        Nginx -->|Static| Front[Frontend Files]
        Nginx -->|Proxy /api| Node[Node.js API :8003]
        Node -->|TCP :5434| PG[(PostgreSQL 16)]
    end

```

*Versão ASCII "raw"*

```text
┌─────────────────────────────────────────────────────┐
│                   CLOUDFLARE                        │
│                  pmes.site.com                      │
│                (SSL + Proxy + Tunnel)               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│               ORANGE PI 5 (Docker)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │           cloudflared (tunnel)                 │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │                             │
│  ┌────────────────────▼───────────────────────────┐ │
│  │              nginx (frontend)                  │ │
│  │         /mensal.html, /iseo.html               │ │
│  └────────────────────────────────────────────────┘ │
│                       │                             │
│  ┌────────────────────▼───────────────────────────┐ │
│  │         node:api (backend :3000)               │ │
│  │              Express + JWT                     │ │
│  └────────────────────┬───────────────────────────┘ │
│                       │                             │
│  ┌────────────────────▼───────────────────────────┐ │
│  │           postgres:16 (:5434)                  │ │
│  │              Volume persistente                │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## 📋 Módulos

- **Escala Mensal** - Escala 12x24/12x72 com equipes A-E
- **Escala ISEO** - Escala diária de operações

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JS (Sem frameworks pesados).
* **Backend:** Node.js + Express.
* **Auth:** JWT + bcrypt.
* **Database:** PostgreSQL 16.
* **Infra:** Docker Compose + Cloudflare Tunnel.
* **Hardware:** Orange Pi 5 (ARM64).

## 🚀 Deploy
```bash
# Clone
git clone https://github.com/Self-Labs/pmes.git
cd pmes

# Configurar ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Subir containers
docker-compose up -d
```

## 🌐 Acesso

- **URL:** https://pmes.technove.com.br
- **Portas locais:**
  - Frontend: 3002
  - API: 8003
  - Database: 5434

## 📂 Estrutura
```text
pmes/
├── .gitignore
├── .env.example
├── README.md
├── docker-compose.yml  # Orquestração
├── nginx.conf
├── database/
│   └── init.sql        # Schema inicial
├── backend/            # API Server
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── config/
│       │   └── db.js
│       ├── middleware/
│       │   └── auth.js
│       └── routes/     # Endpoints
│           ├── auth.js
│           ├── usuarios.js
│           ├── unidades.js
│           └── escalas.js
└── frontend/           # Web Server (Nginx)
    ├── index.html
    ├── cadastro.html
    ├── mensal.html
    ├── iseo.html
    ├── admin.html
    ├── 404.html
    ├── css/
    │   └── styles.css
    └── js/
        ├── api.js      # Fetch wrapper
        └── auth.js
```

## 📝 Licença

© 2026 Self-Labs. Todos os direitos reservados.