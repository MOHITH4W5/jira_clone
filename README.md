# Jira Clone SaaS

Enterprise-style Jira-inspired project management platform with a Next.js frontend and Spring Boot backend.

## Tech Stack
- `client`: Next.js 16, React 19, Tailwind, STOMP WebSocket, Recharts
- `server`: Spring Boot 4, MongoDB Atlas, WebSocket, Mail integration
- `database`: MongoDB Atlas
- `deploy`: Vercel (`client`) + Render (`server`)

## Core Features
- Role-based access control (`ADMIN`, `PROJECT_MANAGER`, `MEMBER`, `VIEWER`)
- Kanban + Backlog with drag/drop and real-time updates
- Subtasks, task dependencies, and dependency validation
- Work logs and sprint-level/issue-level time totals
- In-app notifications + optional email notifications
- Audit History timeline with project-scoped access control
- File attachments with extension and size validation
- Google sign-in + Google reCAPTCHA protection
- Password reset and email verification flows
- Interactive project dashboards (status and progress charts)

## Local Setup

### 1) Backend
```bash
cd server
cp .env.example .env
./mvnw -DskipTests package
./mvnw spring-boot:run
```

### 2) Frontend
```bash
cd client
npm install
npm run dev
```

## Required Environment Variables

### Backend (`server/.env`)
- `SPRING_DATA_MONGODB_URI`
- `MAIL_ENABLED`
- `VERIFICATION_BASE_URL`
- `RESET_PASSWORD_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `RECAPTCHA_ENABLED`
- `RECAPTCHA_SECRET_KEY`

### Frontend (`client/.env.local`)
- `NEXT_PUBLIC_API_BASE_URL`
- `API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

## Deployment

### Vercel (Frontend)
- Root directory: `client`
- Build command: default Next.js
- Set frontend env vars from section above

### Render (Backend)
- Root directory: `server`
- Dockerfile path: `./Dockerfile` when root is `server` (or `./server/Dockerfile` if root is repo root)
- Exposed port: Render-provided `PORT`
- Set backend env vars from section above

### MongoDB Atlas
- Use a database user with least privilege
- Allow Render egress access using Atlas network rules
- Use `mongodb+srv://.../jira?...` in `SPRING_DATA_MONGODB_URI`

## Professional Domain + SSL
- Vercel: add your custom domain in project settings and enable DNS there.
- Render: add your backend custom domain in service settings.
- Both Vercel and Render provision HTTPS certificates automatically after DNS verification.

## Help Inside App
- `History` page: project audit trail (who changed what and when)
- `Help` page: quick product onboarding for roles, notifications, and workflows
