FROM node:18.20-alpine

WORKDIR /src
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3003
CMD ["npm", "start"]