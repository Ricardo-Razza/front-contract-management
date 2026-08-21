# Stage 1: Build da aplicação Angular
FROM node:20-alpine AS build
WORKDIR /app

# Copia dependências e instala
COPY package*.json ./
RUN npm ci

# Copia o código fonte e gera o build de produção
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Servidor Web Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Remove arquivos padrões do Nginx
RUN rm -rf ./*

# Copia o build gerado no Stage 1 (Angular 17+ gera os arquivos em dist/<app>/browser)
COPY --from=build /app/dist/arp-frontend/browser ./

# Copia configuração customizada do Nginx com suporte a SPA e rotas do Angular
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
