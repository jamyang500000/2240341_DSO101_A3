# DSO101 – Assignment III: GitHub Actions + Docker + Render Deployment

**Student ID:** 02240341  
**Module:** Continuous Integration and Continuous Deployment (DSO101)  
**Programme:** Bachelor's of Engineering in Software Engineering (SWE)  
**Date of Submission:** 29th April  
**GitHub Repository:** https://github.com/jamyang500000/DSO_Assignment_1

---

## Table of Contents

1. [Objective](#objective)
2. [Tools & Technologies](#tools--technologies)
3. [Application Overview](#application-overview)
4. [Steps Taken](#steps-taken)
5. [Architecture Diagram](#architecture-diagram)
6. [Screenshots](#screenshots)
7. [Challenges Faced](#challenges-faced)
8. [Learning Outcomes](#learning-outcomes)
9. [Live Deployment Link](#live-deployment-link)

---

## Objective

This assignment demonstrates the configuration of a **GitHub Actions** CI/CD workflow to automate:

1. Building a Docker container for the to-do list application (from Assignment 1).
2. Pushing the container image to **DockerHub**.
3. Deploying the containerised application on **Render.com**.

---

## Tools & Technologies

| Tool | Purpose |
|------|---------|
| **GitHub** | Source code hosting |
| **GitHub Actions** | CI/CD automation (`.github/workflows/deploy.yml`) |
| **Docker** | Containerisation of frontend and backend |
| **DockerHub** | Container image registry |
| **Render.com** | Cloud deployment platform |
| **Node.js & npm** | Backend runtime and package management |
| **React.js** | Frontend user interface |
| **PostgreSQL** | Relational database for task storage |

---

## Application Overview

The base application is a full-stack **To-Do List** app built in Assignment 1:

- **Backend:** Node.js + Express REST API with full CRUD operations (`GET`, `POST`, `PUT`, `DELETE`) for tasks, connected to a PostgreSQL database.
- **Frontend:** React.js single-page application that communicates with the backend API to display and manage tasks in real time.
- **Database:** PostgreSQL with a `tasks` table auto-initialised on server startup.

### Project Structure

```
DSO_Assignment_1/
├── backend/
│   ├── server.js           # Express API with CRUD routes
│   ├── Dockerfile          # Node.js 20 Alpine container
│   ├── package.json        # Dependencies (express, pg, cors, dotenv)
│   └── .env.example        # Environment variable template
├── frontend/
│   ├── src/App.js          # React app – task list UI with add/edit/delete/complete
│   ├── Dockerfile          # Multi-stage build: Node build → serve static
│   └── package.json        # React dependencies
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions CI/CD pipeline
├── docker-compose.yml      # Local development stack
├── render.yaml             # Render Blueprint for cloud deployment
└── README.md               # This report
```

---

## Steps Taken

### Task 1: GitHub Repository Setup

1. Verified that the existing to-do application from Assignment 1 was hosted on a **public GitHub repository** at `https://github.com/jamyang500000/DSO_Assignment_1`.
2. Confirmed that `package.json` in the backend included the necessary scripts:
   - `"start": "node server.js"` — used by Docker to launch the app.
   - `"test": "echo \"No tests yet - placeholder for CI\" && exit 0"` — placeholder test script for CI compatibility.
3. Ensured the `main` branch was up to date and the repository was set to **public** so Render and GitHub Actions could access it without authentication issues.

### Task 2: Verifying Dockerfiles

Both the backend and frontend were containerised using separate Dockerfiles.

**Backend Dockerfile (`./backend/Dockerfile`):**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm test
EXPOSE 5000
CMD ["npm", "start"]
```

- Uses the official **Node.js 20 Alpine** image for a lightweight container.
- Runs `npm test` during the build step to validate the application before deployment.
- Exposes port `5000` for the Express server.

**Frontend Dockerfile (`./frontend/Dockerfile`):**

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build
EXPOSE 3000
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
```

- Uses a **multi-stage build** — the first stage builds the React app, the second stage serves compiled static files using `serve`, keeping the final image small.
- The `REACT_APP_API_URL` is passed as a build argument so the frontend knows where to reach the backend API at build time.

**Local testing with Docker Compose:**

Before pushing to Render, the full stack was tested locally:

```bash
docker compose up --build
```

This spun up three containers — `db` (PostgreSQL), `backend`, and `frontend` — all connected on a shared Docker network.

### Task 3: Creating the GitHub Actions Workflow

A workflow file was created at `.github/workflows/deploy.yml` to automate the entire build and deployment process on every push to the `main` branch.

```yaml
name: Build, Push to DockerHub & Deploy to Render

on:
  push:
    branches: ["main"]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and Push Docker Image
        run: |
          docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/todo-app:latest ./backend
          docker push ${{ secrets.DOCKERHUB_USERNAME }}/todo-app:latest

      - name: Trigger Render Deployment
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"
```

**GitHub Secrets configured:**

| Secret Name | Description |
|-------------|-------------|
| `DOCKERHUB_USERNAME` | DockerHub account username |
| `DOCKERHUB_TOKEN` | DockerHub access token (not password) |
| `RENDER_DEPLOY_HOOK_URL` | Render deployment webhook URL |

> **Note:** Credentials were never hardcoded in the codebase — all sensitive values are stored as GitHub Secrets and referenced via `${{ secrets.* }}`.

### Task 4: Deploying on Render.com

Steps followed on Render.com:
1. Created a new **Web Service** and connected the GitHub repository.
2. Selected **"Deploy from existing image"** for the backend, pointing to the DockerHub image.
3. Configured environment variables sourced from the Render PostgreSQL database using `fromDatabase` references — no credentials hardcoded.
4. The frontend service was configured with `REACT_APP_API_URL` pointing to the live backend URL on Render.
5. A **Render Deploy Hook** (webhook URL) was generated from the Render dashboard and saved as a GitHub Secret so the Actions workflow can trigger a redeployment automatically after each image push.

---

## Architecture Diagram

```
Developer (git push to main)
        │
        ▼
┌───────────────────────┐
│   GitHub Actions      │  (.github/workflows/deploy.yml)
│                       │
│  1. Checkout code     │
│  2. Login to DockerHub│
│  3. Build & Push      │──────────► DockerHub (todo-app:latest)
│     Docker Image      │
│  4. Trigger Render    │──────────► Render Deploy Webhook
│     Webhook           │
└───────────────────────┘

                    Render.com
          ┌──────────────────────────────┐
          │  PostgreSQL DB               │
          │  (todo-db-02240341)          │
          │         ▲                    │
          │  Backend Service             │
          │  (be-todo-02240341-bp)       │
          │  Node.js + Express :5000     │
          │         ▲                    │
          │  Frontend Service            │
          │  (fe-todo-02240341-bp)       │
          │  React static + serve :3000  │
          └──────────────────────────────┘
                    ▲
               End User (Browser)
```

---

## Screenshots

### Screenshot 1 – GitHub Repository Structure
![GitHub Repository Structure](./screenshots/01-github-repo-structure.png)

*The GitHub repository homepage showing the project file structure including the `backend/` and `frontend/` directories, `Dockerfile`s, `.github/workflows/deploy.yml`, `docker-compose.yml`, and `render.yaml`, confirming all required files are committed and the repository is public.*

---

### Screenshot 2 – GitHub Secrets Configured
![GitHub Secrets](./screenshots/02-github-secrets.png)

*The GitHub repository Settings → Secrets and variables → Actions page showing the three secrets configured for the pipeline: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, and `RENDER_DEPLOY_HOOK_URL`. Actual values are hidden by GitHub for security.*

---

### Screenshot 3 – GitHub Actions Workflow Runs List
![GitHub Actions Runs List](./screenshots/03-github-actions-runs-list.png)

*The GitHub Actions tab showing the list of workflow runs for the `Build, Push to DockerHub & Deploy to Render` workflow. Multiple successful runs are visible, each triggered automatically by a push to the `main` branch.*

---

### Screenshot 4 – GitHub Actions All Steps Passed
![GitHub Actions All Steps Green](./screenshots/04-github-actions-steps-green.png)

*Inside a successful workflow run, showing all four pipeline steps completed with green checkmarks: Checkout Repository, Login to DockerHub, Build and Push Docker Image, and Trigger Render Deployment.*

---

### Screenshot 5 – GitHub Actions Build & Push Step Logs
![GitHub Actions Build Logs](./screenshots/05-github-actions-build-logs.png)

*The expanded logs of the "Build and Push Docker Image" step, showing the Docker build output (layers being built) and the `docker push` command successfully pushing the `todo-app:latest` image to DockerHub.*

---

### Screenshot 6 – DockerHub Repository with Latest Tag
![DockerHub Repository](./screenshots/06-dockerhub-repository.png)

*The DockerHub repository page for `todo-app`, showing the `latest` tag with the last pushed timestamp. This confirms the GitHub Actions pipeline successfully built and pushed the Docker image to the registry.*

---

### Screenshot 7 – DockerHub Image Details
![DockerHub Image Details](./screenshots/07-dockerhub-image-details.png)

*The DockerHub image details page showing the image digest, OS/architecture (linux/amd64), compressed size, and the full tag history. This provides evidence of the image metadata and confirms a valid, deployable image exists in the registry.*

---

### Screenshot 8 – Render Dashboard – Both Services Live
![Render Dashboard Services](./screenshots/08-render-dashboard-services.png)

*The Render.com dashboard showing all three deployed resources: the PostgreSQL database (`todo-db-02240341`), the backend web service (`be-todo-02240341-bp`), and the frontend web service (`fe-todo-02240341-bp`), all with a green **Live** status.*

---

### Screenshot 9 – Render Backend Environment Variables
![Render Backend Environment Variables](./screenshots/09-render-env-variables.png)

*The Render backend service environment variables panel showing all required variables configured: `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME`. Database credentials are sourced directly from the Render-managed PostgreSQL instance rather than being hardcoded.*

---

### Screenshot 10 – Live Application in Browser
![Live Application](./screenshots/10-live-app.png)

*The deployed to-do list application running live at `https://fe-todo-02240341-bp.onrender.com`, with the browser URL bar visible. A task has been added to demonstrate the full end-to-end functionality — the frontend communicates with the backend API, which reads and writes to the PostgreSQL database hosted on Render.*

---

## Challenges Faced

1. **REACT_APP_API_URL baked in at build time:** React's CRA bakes environment variables into the static bundle at build time, not runtime. The `REACT_APP_API_URL` had to be passed as a Docker build argument (`ARG`) in the frontend Dockerfile and set before `npm run build`.

2. **Render does not auto-redeploy on DockerHub push:** Render does not watch DockerHub for new image tags. The solution was to generate a **Render Deploy Hook** and call it via `curl` at the end of the GitHub Actions workflow, ensuring automated redeployment after every image push.

3. **Database SSL in production:** The backend required SSL to connect to the Render-managed PostgreSQL instance. This was handled by conditionally setting `ssl: { rejectUnauthorized: false }` when `NODE_ENV === 'production'`, while keeping SSL disabled for local development.

4. **Secrets management:** All sensitive values (DockerHub credentials, Render webhook URL) were stored as GitHub Secrets and referenced using `${{ secrets.* }}` syntax, keeping the codebase safe as a public repository.

---

## Learning Outcomes

1. **CI/CD pipeline design:** Learned how to design and implement a full GitHub Actions pipeline that automates build, containerisation, image publishing, and cloud deployment with zero manual steps.

2. **Docker multi-stage builds:** Understood how multi-stage Dockerfiles reduce final image size — the frontend image only contains compiled static files and a small HTTP server, not the full Node.js build toolchain.

3. **Environment variable management in containers:** Learned the difference between build-time and runtime environment variables in Docker, and how to correctly pass build arguments for tools that bake variables at compile time.

4. **Secrets and credential security:** Applied best practices for credential handling — never hardcoding sensitive values in source code, always using secret stores injected securely at runtime.

5. **Cloud deployment with Render.com:** Gained practical experience deploying containerised microservices on a cloud platform, configuring managed database connections, and using webhooks to integrate Render with an external CI/CD pipeline.

---

## Live Deployment Link

| Service | URL |
|---------|-----|
| **Frontend (Live App)** | https://fe-todo-02240341-bp.onrender.com |
| **Backend API** | https://be-todo-02240341-bp.onrender.com |
| **GitHub Repository** | https://github.com/jamyang500000/DSO_Assignment_1 |
