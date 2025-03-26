#!/bin/bash

# Скрипт для сборки и запуска проекта в Docker Compose

set -e

echo "=== Сборка и запуск проекта ==="

# Проверка наличия Docker
if ! command -v docker &> /dev/null; then
    echo "Ошибка: Docker не установлен"
    exit 1
fi

# Проверим, какой формат команды Docker Compose доступен
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "Используем docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "Используем docker compose"
else
    echo "Ошибка: Docker Compose не установлен"
    exit 1
fi

# Остановка и удаление существующих контейнеров (если были запущены)
echo "Остановка существующих контейнеров..."
$COMPOSE_CMD down

# Сборка контейнеров
echo "Сборка контейнеров..."
$COMPOSE_CMD build

# Запуск контейнеров
echo "Запуск контейнеров..."
$COMPOSE_CMD up -d

# Ожидание запуска всех сервисов
echo "Ожидание запуска всех сервисов..."
sleep 10

# Проверка статуса контейнеров
echo "Статус контейнеров:"
$COMPOSE_CMD ps

echo ""
echo "=== Проект запущен ==="
echo "Фронтенд доступен по адресу: http://localhost:3000"
echo "Бэкенд API доступен по адресу: http://localhost:5002"
echo "MLflow сервер доступен по адресу: http://localhost:5000"
echo ""
echo "Для остановки проекта используйте: $COMPOSE_CMD down" 