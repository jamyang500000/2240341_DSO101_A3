# frontend/Dockerfile - multi-stage: build with Node, serve with `serve`.
FROM node:18-alpine AS build
WORKDIR /app

# REACT_APP_API_URL must be set BEFORE `npm run build` (CRA bakes it in).
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage: tiny static server that respects $PORT (Render sets this).
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/build ./build

EXPOSE 3000
CMD ["sh", "-c", "serve -s build -l ${PORT:-3000}"]
