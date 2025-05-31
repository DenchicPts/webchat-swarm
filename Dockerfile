FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8989

CMD ["node", "serverApp.js"]
