/**
 * Настройки API для работы с бэкендом
 */

// Получаем URL бэкенда из переменных окружения или используем значение по умолчанию
const getBackendUrl = (): string => {
  // В браузере используем NEXT_PUBLIC_* переменные
  if (typeof window !== 'undefined') {
    // Для production окружения
    if (process.env.NODE_ENV === 'production') {
      return process.env.NEXT_PUBLIC_PRODUCTION_BACKEND_URL || 'https://api.nevermoxsw.tech';
    }
    // Для локальной разработки
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
  }
  
  // Для серверного рендеринга
  return process.env.BACKEND_URL || 'http://backend:5002';
};

// Базовый URL для API
export const API_BASE_URL = getBackendUrl();

// Эндпоинты API
export const API_ENDPOINTS = {
  GENERATE: `${API_BASE_URL}/generate`,
  GENERATION_STATUS: `${API_BASE_URL}/generation-status`,
  CANCEL_GENERATION: `${API_BASE_URL}/cancel-generation`,
  LAST_IMAGE: `${API_BASE_URL}/last-image`,
  RECENT_IMAGES: `${API_BASE_URL}/recent-images`,
  CLEAR_GENERATION_STATUS: `${API_BASE_URL}/clear-generation-status`,
};

export default API_ENDPOINTS; 