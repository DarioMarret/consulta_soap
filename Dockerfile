FROM node:alpine

WORKDIR /soap

COPY server.js ./

COPY consulta.wsdl ./

COPY consultaResul.wsdl ./

COPY serviceConsulta.wsdl ./

COPY package*.json ./

RUN npm install -g npm@

RUN npm install

COPY . .

CMD ["npm", "start"]