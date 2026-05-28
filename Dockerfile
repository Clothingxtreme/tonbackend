# syntax = docker/dockerfile:1

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-slim as base

WORKDIR /app
ENV NODE_ENV=production

FROM base as build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

FROM base

COPY --from=build /app /app

EXPOSE 3000
CMD ["node","server.js"]