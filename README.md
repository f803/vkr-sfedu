# Проект генерации изображений ВКР

Проект состоит из следующих компонентов:
- Фронтенд (Next.js)
- API-сервер (Flask)
- MLflow сервер для управления моделями
- Redis для хранения состояния
- MySQL для хранения данных MLflow

## Локальный запуск

### Предварительные требования
- Docker
- Docker Compose v2
- Не менее 8 ГБ оперативной памяти

### Запуск проекта

1. Клонируйте репозиторий:
```
git clone <URL_репозитория>
cd vkr
```

2. Запустите скрипт сборки и запуска:
```
./build.sh
```

3. Откройте в браузере:
- Фронтенд: http://localhost:3000
- API-сервер: http://localhost:5002
- MLflow: http://localhost:5000

### Остановка проекта

```
docker-compose down
```

## Деплой в Yandex Cloud

### Подготовка

1. Создайте виртуальный сервер в Yandex Cloud
2. Настройте DNS-записи:
   - api.nevermoxsw.tech → IP вашего сервера (для API)
   - vkr.nevermoxsw.tech → IP вашего сервера (для фронтенда)

3. Установите Docker и Docker Compose на сервер
```
sudo apt update
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker $USER
```

4. Настройте SSL с помощью Certbot:
```
sudo apt install -y certbot
sudo certbot certonly --standalone -d vkr.nevermoxsw.tech -d api.nevermoxsw.tech
```

5. Создайте файл docker-compose.prod.yml для боевого окружения:
```yaml
version: '3.8'

services:
    nginx:
        image: nginx:latest
        ports:
            - "80:80"
            - "443:443"
        volumes:
            - ./nginx/conf:/etc/nginx/conf.d
            - ./nginx/ssl:/etc/nginx/ssl
            - /etc/letsencrypt:/etc/letsencrypt
        depends_on:
            - front
            - backend
        restart: always
        networks:
            - app-network

    # Остальные сервисы такие же, как в docker-compose.yml
    # ...
```

6. Создайте конфигурацию Nginx:
```
mkdir -p nginx/conf
```

7. Создайте файл nginx/conf/default.conf:
```
server {
    listen 80;
    server_name vkr.nevermoxsw.tech;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name vkr.nevermoxsw.tech;
    
    ssl_certificate /etc/letsencrypt/live/vkr.nevermoxsw.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vkr.nevermoxsw.tech/privkey.pem;
    
    location / {
        proxy_pass http://front:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 80;
    server_name api.nevermoxsw.tech;
    
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name api.nevermoxsw.tech;
    
    ssl_certificate /etc/letsencrypt/live/api.nevermoxsw.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.nevermoxsw.tech/privkey.pem;
    
    location / {
        proxy_pass http://backend:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

8. Запустите проект в production-режиме:
```
docker-compose -f docker-compose.prod.yml up -d
```

## Дополнительная информация

### Структура проекта
- `front/` - код фронтенда
- `backend/` - код бэкенда
- `mlflow/` - настройки MLflow
- `model/` - модель и её файлы
- `images/` - сгенерированные изображения
- `docker-compose.yml` - конфигурация для локальной разработки
- `docker-compose.prod.yml` - конфигурация для продакшн-окружения 