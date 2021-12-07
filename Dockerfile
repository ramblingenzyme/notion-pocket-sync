FROM node:lts-alpine3.12

RUN apk update \
  && apk upgrade

RUN apk update \
  && apk add --no-cache yarn

COPY package.json yarn.lock ./

RUN yarn

COPY tsconfig.json ./
COPY src/ ./src

RUN ls src && yarn build

COPY .env .

ENTRYPOINT yarn start:prod