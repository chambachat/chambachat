#!/usr/bin/env bash
# Script de construcción para Render
set -o errexit

echo ">>> Instalando dependencias de Python..."
pip install -r backend/requirements.txt

echo ">>> Compilando frontend React..."
cd frontend
npm install
npm run build
cd ..

echo ">>> Construcción completada exitosamente!"
