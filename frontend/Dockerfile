FROM nginx:alpine

# 1. Configuração do Servidor (Vai para a pasta de sistema, longe do público)
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 2. Arquivos do Site (Copia APENAS o que o usuário pode ver)
WORKDIR /usr/share/nginx/html

# Copia apenas os HTMLs da raiz
COPY *.html ./

# Copia o favicon
COPY favicon.ico ./

# Copia apenas as pastas de recursos (CSS e JS)
COPY css/ ./css/
COPY js/ ./js/

# Resultado: O Dockerfile e o nginx.conf NÃO são copiados para a pasta pública.
# Se você criar um arquivo .env ou .git no frontend por engano, ele também NÃO será copiado.