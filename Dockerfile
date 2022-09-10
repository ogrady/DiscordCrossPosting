# ---- Base Node ----
FROM node:18-alpine AS base
RUN npm install -g npm@latest

# set working directory
WORKDIR /app


# ---- Dependencies ----
FROM base AS dependencies
RUN apk add --no-cache make gcc g++ python3
# install node packages
RUN npm set progress=false && npm config set depth 0
COPY package*.json ./
RUN npm install --omit=dev --loglevel info

# ---- Build ----
FROM dependencies AS build
# copy production node_modules
RUN npm install --only=dev --loglevel info

COPY . .
RUN cp config.json.example ./data/config.json && npm run build && rm ./data/config.json


# ---- final ----
FROM base AS final

VOLUME /app/data/

COPY --from=dependencies /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build

CMD ["node","/app/build/index.js"]
