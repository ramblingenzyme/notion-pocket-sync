FROM node:lts-alpine3.12

RUN mkdir /app
WORKDIR /app

RUN apk update \
  && apk upgrade

RUN apk update \
  && apk add --no-cache yarn

COPY .yarn ./.yarn
COPY .yarnrc.yml ./
COPY package.json yarn.lock ./

RUN yarn

COPY tsconfig.json ./
COPY src/ ./src

RUN ls src && yarn build

COPY .env .

ENTRYPOINT yarn start:prod