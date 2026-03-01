FROM node:20-alpine

WORKDIR /app

# On ne copie que les fichiers de dépendances pour profiter du cache Docker
COPY package*.json ./

# Installation propre
RUN npm install

# Copie du code source
COPY . .

EXPOSE 3001

# En dev, Next.js a besoin de surveiller les fichiers
CMD ["npm", "run", "dev"]