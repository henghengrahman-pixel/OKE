FROM node:18

# install python
RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

# install dependency
RUN npm install
RUN pip3 install -r requirements.txt

# permission
RUN chmod +x start.sh

CMD ["bash", "start.sh"]
