# ---- Base Node ----
FROM node:14-alpine AS base
RUN npm install -g npm@latest

# set working directory
WORKDIR /app


# ---- Dependencies ----
FROM base AS dependencies

RUN apk add --no-cache make gcc g++ python3

# install node packages
RUN npm set progress=false && npm config set depth 0

COPY package*.json ./
RUN npm install --only=production --loglevel info


# ---- Build ----
FROM dependencies AS build
# copy production node_modules
RUN npm install --only=development --loglevel info

COPY . .
RUN npm run build


# ---- final ----
FROM base AS final

VOLUME /app/db/
VOLUME /app/config.json

COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=build /app/built /app/built

CMD ["node","/app/built/index.js"]
