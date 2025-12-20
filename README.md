# 📚 Virtual Study Room (WIP)

![Status](https://img.shields.io/badge/Status-In%20Development-yellow)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

A real-time, secure, and collaborative virtual study environment. This application allows users to create and join study rooms, chat in real-time with end-to-end encryption, and manage study sessions with integrated moderation tools.

**⚠️ Note:** This project is currently under active development. Features and APIs are subject to change.

---

## 🚀 Tech Stack

### Backend
- **Framework:** Django & Django REST Framework (DRF)
- **Real-time:** Django Channels (WebSockets)
- **Database:** PostgreSQL
- **Caching/Channel Layer:** Redis
- **Authentication:** JWT (HttpOnly Cookies) + SimpleJWT
- **Security:** `cryptography` (Fernet) for message content encryption

### Frontend
- **Framework:** React (Vite)
- **Language:** TypeScript
- **State/Data Fetching:** TanStack Query (React Query)
- **UI Component Library:** Material UI (MUI) v5
- **Forms:** React Hook Form + Zod Validation
- **Icons:** Lucide React

### DevOps
- **Containerization:** Docker & Docker Compose

---

## ✨ Features

### ✅ Implemented
- **Authentication System**
  - Secure Registration & Login
  - JWT-based auth with automatic token refreshing
  - Password Reset flow (Email simulation)
- **Room Management**
  - Create public or private (invite-only) rooms
  - Room capacity limits
  - Join/Leave functionality
- **Real-time Chat**
  - WebSocket-based instant messaging
  - **Encrypted Messaging:** Messages are encrypted at rest and in transit
  - Edit & Delete messages
  - Typing indicators
  - "Seen by" read receipts
- **Moderation Tools**
  - Room Owners/Admins can Kick users
  - Mute users for specific durations
  - Promote members to Moderators/Admins
- **Presence System**
  - Live "Online Users" list in sidebar

### 🚧 Roadmap / In Progress
- [ ] **Message Reactions:** Add emoji reactions to messages (Backend stubbed, UI pending)
- [ ] **Study Tools:** Integrated Pomodoro timer (UI stubbed)
- [ ] **File Sharing:** Secure file upload and sharing within rooms
- [ ] **Video/Audio:** WebRTC integration for voice/video channels
- [ ] **Private DM:** Direct messaging between users
- [ ] **Notifications:** Push notifications for mentions and room invites

---

## 🛠️ Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)
- Python (v3.10+)

### 1. Clone the Repository
```bash
git clone https://github.com/tesfa27/virtual-study-room.git
cd virtual-study-room
```

### 2. Environment Variables
Create a `.env` file in the root directory (or use the provided example):

```env
# Database
POSTGRES_DB=virtual_study_room
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Backend
SECRET_KEY=dev_secret_key_change_in_prod
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173

# Encryption (32 url-safe base64-encoded bytes)
ENCRYPTION_KEY=...
```

### 3. Run with Docker (Recommended)
This will start the Backend (Django), Frontend (Vite), Database (Postgres), and Redis.

```bash
docker compose up --build
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000/api](http://localhost:8000/api)
- **Admin Panel:** [http://localhost:8000/admin](http://localhost:8000/admin)

### 4. Manual Setup (Without Docker)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Project Structure

```
virtual-study-room/
├── backend/                # Django Project
│   ├── config/             # Settings, ASGI, WSGI
│   ├── rooms/              # Room & Chat Logic (Consumers, Views, Models)
│   ├── users/              # Auth & User Management
│   └── utils/              # Helpers (Encryption, etc.)
│
├── frontend/               # React Project
│   ├── src/
│   │   ├── api/            # API Client & Endpoints
│   │   ├── components/     # Reusable UI Components
│   │   ├── hooks/          # Custom React Hooks
│   │   ├── pages/          # Route Pages
│   │   └── types/          # TypeScript Interfaces & Zod Schemas
│   └── ...
│
└── docker-compose.yaml     # Orchestration
```

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request


