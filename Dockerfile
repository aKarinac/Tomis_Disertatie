# FROM node:20-slim AS base
# ENV PNPM_HOME="/pnpm"
# ENV PATH="$PNPM_HOME:$PATH"
# RUN corepack enable
# COPY . /app
# WORKDIR /app

# FROM base AS build
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# RUN pnpm build

# FROM base
# COPY --from=build /app/node_modules /app/node_modules
# COPY --from=build /app/dist /app/dist
# EXPOSE 8080
# CMD [ "pnpm", "dev" ]

# Folosește o imagine de bază care să aibă un server HTTP
FROM nginx:alpine

# Copiază fișierele tale HTML în directorul corespunzător al containerului
COPY ./ /usr/share/nginx/html

# Expune portul 80 pentru a putea accesa aplicația
EXPOSE 80

# Start nginx în modul de primire a cererilor HTTP
CMD ["nginx", "-g", "daemon off;"]

