# 1. L'immagine base
FROM node:18

# 2. Directory di lavoro
WORKDIR /src

# 3. Copia package.json ed installali
COPY package*.json ./
RUN npm install

# 4. Copia tutto
COPY . .

# 5. Usa la port 3002
EXPOSE 3002

# 6. Default command
CMD ["npm", "start"]