FROM node:20-alpine

WORKDIR /app

# Separate dependency install from source copy so Docker's layer cache
# survives source-only changes - only re-runs npm ci when package*.json
# actually changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ts-node/typescript are devDependencies but are required at runtime (every
# npm script - api, analyze, compare-resumes, specs - runs source .ts files
# directly via `ts-node/register/transpile-only`, there is no separate build
# step) - `npm ci` above deliberately installs devDependencies too, not just
# production ones.
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "run", "api"]
