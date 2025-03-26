# Этап сборки
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем файлы зависимостей
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Создаем файл next.config.js, если он отсутствует
RUN test -f next.config.js || touch next.config.js

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Этап production
FROM node:18-alpine AS runner

WORKDIR /app

# Устанавливаем curl для healthcheck
RUN apk add --no-cache curl

# Устанавливаем только production зависимости
COPY package*.json ./
RUN npm ci --only=production

# Копируем собранное приложение и необходимые файлы
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/src ./src

# Базовые переменные окружения
ENV NODE_ENV=production \
    PORT=3000

# Оптимизация для production
RUN npm cache clean --force && \
    find . \( -name '*.md' -o -name '*.spec.js' \) -delete

# Настройка здоровья приложения
# HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
#   CMD curl --fail http://localhost:3000/api/health || exit 1

# Запуск с минимальными привилегиями
USER node
EXPOSE 3000

# Указываем точку входа и команду запуска
ENTRYPOINT ["npm", "run"]
CMD ["start"]
