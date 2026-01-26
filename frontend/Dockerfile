FROM nginx:alpine

# Remove a config padrão que vem no Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia a sua config (que você moveu para a pasta frontend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia todo o site estático para o local padrão do Nginx
COPY . /usr/share/nginx/html