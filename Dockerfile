FROM node:18-bookworm

RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN pip3 install --break-system-packages -r requirements.txt
RUN chmod +x start.sh

CMD ["bash", "start.sh"]
