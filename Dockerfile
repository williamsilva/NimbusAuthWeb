# syntax=docker/dockerfile:1.5
FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
# --mount=type=secret: o arquivo só existe em /run/secrets/node_auth_token durante este RUN,
# nunca gravado em nenhuma camada da imagem nem visível em `docker history`/build logs - mesmo
# padrão seguro já corrigido no CardSyncWeb/Dockerfile (ARG/--build-arg vaza em texto puro no log
# de build). O .npmrc precisa vir copiado JUNTO com package.json (antes do npm ci), não depois.
RUN --mount=type=secret,id=node_auth_token \
    export NODE_AUTH_TOKEN="$(cat /run/secrets/node_auth_token)" && npm ci
COPY . .
# "development" (não o default "production" do angular.json) - esta imagem é usada pelo
# docker-compose LOCAL; precisa do environment.ts (apiBaseUrl/auth.* apontando pra
# localhost:9090/localhost:4200) em vez do environment.prod.ts (fileReplacement só existe na
# config "production"), senão a SPA fala com o backend de PRODUÇÃO e o client OAuth2
# "nimbuscore-web" (só registrado com redirect-uri localhost:4200 em application-dev.yml) não bate.
RUN npm run build -- --configuration development

FROM nginx:1.27-alpine
COPY --from=build /workspace/dist/NimbusCoreWeb/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
