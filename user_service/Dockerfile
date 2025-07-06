# 1. L'immagine base
FROM node:alpine

# 2. Directory di lavoro
WORKDIR /src

# 3. Copia package.json ed installali
COPY package*.json ./
RUN npm install

# 4. Copia tutto
COPY . .

# 5. Usa la port 3001
EXPOSE 3001

# 6. Default command
CMD ["npm", "start"]