# Folosește o imagine de bază pentru un server web
FROM nginx:latest

# Copiază fișierele din directorul curent în container
COPY . /usr/share/nginx/html

# Expune portul 80 pentru acces web
EXPOSE 80

# Comanda implicită pentru a porni serverul nginx
CMD ["nginx", "-g", "daemon off;"]

