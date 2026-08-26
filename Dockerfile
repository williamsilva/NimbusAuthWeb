# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "development" (não o default "production" do angular.json) - esta imagem é usada pelo
# docker-compose LOCAL; precisa do environment.ts (apiBaseUrl/auth.* apontando pra
# localhost:9090/localhost:4200) em vez do environment.prod.ts (fileReplacement só existe na
# config "production"), senão a SPA fala com o backend de PRODUÇÃO e o client OAuth2
# "nimbusauth-web" (só registrado com redirect-uri localhost:4200 em application-dev.yml) não bate.
RUN npm run build -- --configuration development

FROM nginx:1.27-alpine
COPY --from=build /workspace/dist/NimbusAuthWeb/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
