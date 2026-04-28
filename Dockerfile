FROM node:18

# install python
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

# install node
RUN npm install

# 🔥 FIX ERROR PEP 668
RUN pip3 install --break-system-packages -r requirements.txt

RUN chmod +x start.sh

CMD ["bash", "start.sh"]
