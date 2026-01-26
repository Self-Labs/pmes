#!/bin/bash
# Para o script se houver qualquer erro
set -e
# Garante que o comando rode na pasta onde o script está (raiz do repo)
cd "$(dirname "$0")"
echo "=========================================="
echo "--- Verificando atualizações Sistema de Escalas em $(date) ---"
# --- CONFIGURAÇÃO ---
BRANCH="master"
# Atualiza referências do git sem baixar os arquivos ainda
git fetch origin $BRANCH
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "🚀 Atualização detectada na $BRANCH ($REMOTE). Iniciando deploy..."
  # 1. Reseta o código local para ficar IDÊNTICO ao GitHub
  git reset --hard origin/$BRANCH
  git clean -fd
  echo "📦 Reconstruindo imagens e subindo containers..."
  docker compose up -d --build --remove-orphans
  echo "⏳ Aguardando a API iniciar (5s)..."
  sleep 5
  echo "✅ Atualização aplicada com sucesso em $(date)"
else
  echo "💤 Nenhuma atualização encontrada. Tudo atualizado."
fi
echo "Processo finalizado."
echo "=========================================="