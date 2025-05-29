FROM node:18-alpine
WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .


ENV REDIS_HOST=redis
ENV REDIS_PORT=6379


EXPOSE 80

CMD ["npm", "start"]

