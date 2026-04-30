# Pin to an LTS major. "latest" can move under us between runs.
FROM node:20

WORKDIR /src

# Copy package manifests first so Docker can cache the npm install layer.
COPY package*.json /src/

# supervisor watches files and restarts the server on change (dev only).
RUN npm install -g supervisor && npm install

# Copy the rest of the source.
COPY . /src

EXPOSE 3000

# In production (Render etc.) we run `node` directly — supervisor's
# file-watching is dev-only and would just waste cycles.
# In dev (docker compose locally) NODE_ENV is unset and supervisor
# gives hot reloads on .js / .pug / .css / .sql changes.
CMD if [ "$NODE_ENV" = "production" ]; then \
      node index.js; \
    else \
      supervisor -e 'js,pug,html,css,sql' index.js; \
    fi



