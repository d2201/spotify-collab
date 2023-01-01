FROM node:18-alpine as build

WORKDIR /build

COPY . .

RUN yarn && yarn build

FROM node:18-alpine as prod

WORKDIR /app

COPY --from=build /build/dist dist
COPY --from=build /build/package.json .
COPY --from=build /build/yarn.lock .

RUN yarn --prod && yarn cache clean

CMD ["node", "dist/index.js"]