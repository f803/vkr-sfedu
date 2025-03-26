import mlflow
from diffusers import StableDiffusionPipeline
import torch
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import base64
from io import BytesIO
import boto3
import os
from datetime import datetime, timezone
import botocore
import re
import threading
import time
import json
import redis
from redis.exceptions import ConnectionError, TimeoutError
from functools import wraps

app = Flask(__name__)
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://front:3000", "https://vkr.nevermoxsw.tech"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Настройка MLflow
mlflow.set_tracking_uri("http://web:5000")
mlflow.set_experiment("stable")

# Настройка переменных окружения для MLflow
os.environ['MLFLOW_S3_ENDPOINT_URL'] = 'https://storage.yandexcloud.net'
os.environ['AWS_ACCESS_KEY_ID'] = '${YC_ACCESS_KEY_ID:-your_key_id_here}'
os.environ['AWS_SECRET_ACCESS_KEY'] = '${YC_SECRET_ACCESS_KEY:-your_secret_key_here}'
os.environ['MLFLOW_S3_IGNORE_TLS'] = 'true'
os.environ['MLFLOW_DEFAULT_ARTIFACT_ROOT'] = 's3://vkr-images/mlflow/'

# Настройка Yandex Object Storage
session = boto3.session.Session()
s3 = session.client(
    service_name='s3',
    region_name='ru-central1',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id='${YC_ACCESS_KEY_ID:-your_key_id_here}',
    aws_secret_access_key='${YC_SECRET_ACCESS_KEY:-your_secret_key_here}'
)

BUCKET_NAME = 'vkr-images'  # Используем существующий бакет

# Проверяем существование бакета
try:
    s3.head_bucket(Bucket=BUCKET_NAME)
    print(f"Бакет {BUCKET_NAME} существует")
except botocore.exceptions.ClientError as e:
    error_code = e.response['Error']['Code']
    error_message = e.response['Error'].get('Message', '')
    print(f"Ошибка при проверке бакета: код {error_code}, сообщение: {error_message}")
    if error_code == '404':
        try:
            print(f"Пытаемся создать бакет {BUCKET_NAME}...")
            s3.create_bucket(
                Bucket=BUCKET_NAME,
                CreateBucketConfiguration={'LocationConstraint': 'ru-central1'}
            )
            print(f"Бакет {BUCKET_NAME} успешно создан")
        except Exception as create_error:
            print(f"Ошибка при создании бакета: {str(create_error)}")
            if hasattr(create_error, 'response'):
                print(f"Детали ошибки: {create_error.response}")
            raise
    else:
        print(f"Ошибка при проверке бакета: {str(e)}")
        if hasattr(e, 'response'):
            print(f"Детали ошибки: {e.response}")
        raise
except Exception as e:
    print(f"Неожиданная ошибка при работе с бакетом: {str(e)}")
    if hasattr(e, 'response'):
        print(f"Детали ошибки: {e.response}")
    raise

# Инициализация модели
pipe = StableDiffusionPipeline.from_pretrained("CompVis/stable-diffusion-v1-4")
if torch.cuda.is_available():
    pipe = pipe.to("cuda")

# Создаем директорию для локальных артефактов
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

# Добавляем переменные для отслеживания состояния генерации
generation_thread = None
cancel_requested = False
generation_start_time = None
current_progress = {
    'step': 0,
    'total': 50,
    'remaining_minutes': 2.0
}

# Добавляем словарь для хранения последних изображений по IP
last_images_by_ip = {}

# В начале файла после других глобальных переменных
generation_status_by_ip = {}  # Словарь для хранения статуса генерации по IP

# После создания ARTIFACTS_DIR
LAST_IMAGES_FILE = os.path.join(os.path.dirname(__file__), "last_images.json")

# После импортов
import redis
from redis.exceptions import ConnectionError, TimeoutError
from functools import wraps
import time

class RedisManager:
    def __init__(self, host=None, port=6379, db=0, max_retries=3, retry_delay=1):
        self.host = host or os.environ.get('REDIS_HOST', 'localhost')
        self.port = port
        self.db = db
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._client = None
        self.connect()
    
    def connect(self):
        """Установка соединения с Redis"""
        try:
            if self._client is None:
                print(f"Подключение к Redis на {self.host}:{self.port}")
                self._client = redis.Redis(
                    host=self.host,
                    port=self.port,
                    db=self.db,
                    socket_timeout=5,
                    socket_connect_timeout=5,
                    health_check_interval=30
                )
                # Проверяем соединение
                self._client.ping()
                print("Успешное подключение к Redis")
        except (ConnectionError, TimeoutError) as e:
            print(f"Ошибка подключения к Redis: {str(e)}")
            self._client = None
            raise
    
    def ensure_connection(self):
        """Проверка и восстановление соединения при необходимости"""
        if self._client is None:
            self.connect()
            return
        
        try:
            self._client.ping()
        except (ConnectionError, TimeoutError):
            print("Соединение с Redis потеряно, пытаемся переподключиться...")
            self._client = None
            self.connect()
    
    def get_client(self):
        """Получение клиента Redis с проверкой соединения"""
        self.ensure_connection()
        return self._client
    
    @property
    def client(self):
        """Свойство для доступа к клиенту Redis"""
        return self.get_client()

def with_redis_retry(f):
    """Декоратор для автоматического повтора операций Redis при ошибках"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        retries = 0
        while retries < redis_manager.max_retries:
            try:
                return f(*args, **kwargs)
            except (ConnectionError, TimeoutError) as e:
                retries += 1
                if retries == redis_manager.max_retries:
                    print(f"Не удалось выполнить операцию Redis после {retries} попыток")
                    raise
                print(f"Ошибка Redis: {str(e)}. Попытка {retries}/{redis_manager.max_retries}")
                time.sleep(redis_manager.retry_delay)
                redis_manager.ensure_connection()
    return wrapper

# Создаем глобальный экземпляр RedisManager
redis_manager = RedisManager()

@with_redis_retry
def save_generation_status(client_ip, status):
    """Сохранение статуса генерации в Redis с автоматическим повтором при ошибках"""
    try:
        if 'start_time' in status and isinstance(status['start_time'], datetime):
            status['start_time'] = status['start_time'].isoformat()
        
        ttl = 600 if status.get('active', False) else 60
        redis_manager.client.setex(
            f"generation_status:{client_ip}",
            ttl,
            json.dumps(status)
        )
        print(f"Статус сохранен в Redis для IP {client_ip}")
    except Exception as e:
        print(f"Ошибка при сохранении статуса в Redis: {str(e)}")
        raise

@with_redis_retry
def get_generation_status(client_ip):
    """Получение статуса генерации из Redis с автоматическим повтором при ошибках"""
    try:
        status_json = redis_manager.client.get(f"generation_status:{client_ip}")
        if status_json:
            status = json.loads(status_json)
            if 'start_time' in status:
                status['start_time'] = datetime.fromisoformat(status['start_time'])
            return status
        return None
    except Exception as e:
        print(f"Ошибка при получении статуса из Redis: {str(e)}")
        raise

@with_redis_retry
def delete_generation_status(client_ip):
    """Удаление статуса генерации из Redis с автоматическим повтором при ошибках"""
    try:
        redis_manager.client.delete(f"generation_status:{client_ip}")
        print(f"Статус удален из Redis для IP {client_ip}")
    except Exception as e:
        print(f"Ошибка при удалении статуса из Redis: {str(e)}")
        raise

# Функция для загрузки last_images_by_ip из файла
def load_last_images():
    global last_images_by_ip
    try:
        if os.path.exists(LAST_IMAGES_FILE):
            with open(LAST_IMAGES_FILE, 'r') as f:
                last_images_by_ip = json.load(f)
            print(f"Загружены последние изображения для {len(last_images_by_ip)} IP адресов")
    except Exception as e:
        print(f"Ошибка при загрузке последних изображений: {str(e)}")
        last_images_by_ip = {}

# Функция для сохранения last_images_by_ip в файл
def save_last_images():
    try:
        with open(LAST_IMAGES_FILE, 'w') as f:
            json.dump(last_images_by_ip, f)
        print(f"Сохранены последние изображения для {len(last_images_by_ip)} IP адресов")
    except Exception as e:
        print(f"Ошибка при сохранении последних изображений: {str(e)}")

# Функция для извлечения даты из имени файла
def get_timestamp_from_filename(filename):
    # Пример: generated_20250324_234757.png
    match = re.search(r'generated_(\d{8})_(\d{6})\.png', filename)
    if match:
        date_part = match.group(1)  # 20250324
        time_part = match.group(2)  # 234757
        return int(f"{date_part}{time_part}")
    return 0  # Если формат не соответствует

def callback(*args) -> None:
    if cancel_requested:
        raise StopIteration("Генерация отменена")
    return None

class GenerationResult:
    def __init__(self):
        self.result = None
        self.error = None
        self._lock = threading.Lock()

    def set_result(self, result):
        with self._lock:
            self.result = result
            self.error = None

    def set_error(self, error):
        with self._lock:
            self.error = error
            self.result = None

    def get(self):
        with self._lock:
            if self.error:
                raise Exception(self.error)
            return self.result

# Создаем глобальный объект для хранения результата
generation_result = GenerationResult()

def get_client_ip():
    # Получаем IP из различных заголовков
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0]
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr

# Функция для проверки активности генерации
def is_generation_active(client_ip):
    return (client_ip in generation_status_by_ip and 
            generation_status_by_ip[client_ip]['active'])

# После функции delete_generation_status
def is_generation_stuck(status):
    if not status or not status.get('active', False):
        return False
    
    try:
        start_time = datetime.fromisoformat(status['start_time'])
        # Если генерация идет больше 10 минут, считаем её зависшей
        return (datetime.now(timezone.utc) - start_time).total_seconds() > 600
    except Exception as e:
        print(f"Ошибка при проверке зависшего статуса: {str(e)}")
        return False

@app.route('/clear-generation-status', methods=['POST'])
def clear_generation_status():
    client_ip = get_client_ip()
    print(f"Запрос на очистку статуса от IP: {client_ip}")
    
    try:
        delete_generation_status(client_ip)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        return jsonify({
            'status': 'success',
            'message': 'Статус генерации очищен'
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/generate', methods=['POST'])
def generate_image():
    global generation_thread, cancel_requested, generation_start_time, generation_result
    
    client_ip = get_client_ip()
    print(f"Запрос на генерацию от IP: {client_ip}")
    
    data = request.get_json()
    prompt = data.get('prompt', 'A fantasy landscape, trending on artstation')
    
    # Проверяем статус в Redis
    current_status = get_generation_status(client_ip)
    
    # Проверяем, не зависла ли предыдущая генерация
    if is_generation_stuck(current_status):
        print(f"Обнаружена зависшая генерация для IP {client_ip}, очищаем статус")
        delete_generation_status(client_ip)
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        current_status = None
    
    if current_status and current_status.get('active', False):
        print(f"Уже есть активная генерация для IP {client_ip}")
        return jsonify({
            'status': 'error',
            'message': 'Уже выполняется другая генерация'
        }), 429
    
    try:
        cancel_requested = False
        generation_start_time = datetime.now(timezone.utc)
        generation_result = GenerationResult()
        
        # Инициализируем и сохраняем статус в Redis
        status = {
            'active': True,
            'progress': current_progress.copy(),
            'start_time': generation_start_time,
            'prompt': prompt  # Сохраняем промпт в статусе
        }
        save_generation_status(client_ip, status)
        
        def generate_in_thread():
            try:
                with mlflow.start_run():
                    mlflow.log_param("prompt", prompt)
                    
                    if cancel_requested:
                        print(f"Генерация отменена до запуска модели для IP {client_ip}")
                        generation_result.set_error("Генерация отменена")
                        return
                    
                    try:
                        # Общее количество шагов
                        total_steps = 50  # num_inference_steps
                        
                        # Создаем файл для логов tqdm, если его нет
                        with open('generation.log', 'w') as f:
                            f.write('')  # Очищаем файл перед новой генерацией
                        
                        def progress_callback(step, timestep, latents):
                            global current_progress
                            try:
                                # Читаем последнюю строку из лога tqdm
                                with open('generation.log', 'r') as f:
                                    lines = f.readlines()
                                    for line in reversed(lines):
                                        if '%, ' in line and 'it/s]' in line:
                                            time_match = re.search(r'<(\d+):(\d+)', line)
                                            if time_match:
                                                minutes = int(time_match.group(1))
                                                seconds = int(time_match.group(2))
                                                remaining_minutes = round((minutes + seconds / 60), 1)
                                                
                                                current_progress = {
                                                    'step': step,
                                                    'total': total_steps,
                                                    'remaining_minutes': remaining_minutes
                                                }
                                                # Обновляем прогресс в Redis
                                                status = get_generation_status(client_ip)
                                                if status:
                                                    status['progress'] = current_progress.copy()
                                                    save_generation_status(client_ip, status)
                                                print(f"Прогресс для IP {client_ip}: шаг {step}/{total_steps}, осталось {remaining_minutes} минут (из tqdm)")
                                                return
                            except Exception as e:
                                print(f"Ошибка при чтении времени из лога tqdm: {str(e)}")
                            
                            # Если не удалось получить время из tqdm, используем приблизительный расчет
                            remaining_steps = total_steps - step
                            approx_minutes = round((remaining_steps * 5.5) / 60, 1)
                            current_progress = {
                                'step': step,
                                'total': total_steps,
                                'remaining_minutes': approx_minutes
                            }
                            # Обновляем прогресс в Redis
                            status = get_generation_status(client_ip)
                            if status:
                                status['progress'] = current_progress.copy()
                                save_generation_status(client_ip, status)
                            print(f"Прогресс для IP {client_ip}: шаг {step}/{total_steps}, осталось примерно {approx_minutes} минут (расчетное)")
                        
                        # Генерируем изображение с callback
                        result = pipe(
                            prompt,
                            num_inference_steps=50,
                            guidance_scale=7.5,
                            negative_prompt="ugly, blurry, poor quality, deformed",
                            callback=progress_callback,
                            callback_steps=1  # Вызывать callback на каждом шаге
                        )
                        
                        if not result or not result.images:
                            raise Exception("Не удалось сгенерировать изображение")
                            
                        image = result.images[0]
                        
                        if cancel_requested:
                            print("Генерация отменена после создания изображения")
                            generation_result.set_error("Генерация отменена")
                            return
                        
                        buffered = BytesIO()
                        image.save(buffered, format="PNG")
                        img_str = base64.b64encode(buffered.getvalue()).decode()
                        
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        filename = f"generated_{timestamp}.png"
                        local_path = os.path.join(ARTIFACTS_DIR, filename)
                        
                        image.save(local_path)
                        mlflow.log_artifact(local_path)
                        mlflow.log_param("image_filename", filename)
                        
                        image_url = None
                        try:
                            s3.upload_file(
                                local_path,
                                BUCKET_NAME,
                                filename,
                                ExtraArgs={'ACL': 'public-read'}
                            )
                            image_url = f"https://storage.yandexcloud.net/{BUCKET_NAME}/{filename}"
                            print(f"Изображение успешно загружено в Yandex Object Storage: {image_url}")
                            
                            # Сохраняем информацию о последнем изображении
                            last_images_by_ip[client_ip] = {
                                'url': image_url,
                                'prompt': prompt,
                                'timestamp': timestamp
                            }
                            save_last_images()
                            
                        except Exception as s3_error:
                            print(f"Ошибка при загрузке в Yandex Object Storage: {str(s3_error)}")
                            mlflow.log_param("s3_error", str(s3_error))
                        
                        generation_result.set_result({
                            'status': 'success',
                            'image': img_str,
                            'local_path': local_path,
                            'url': image_url if image_url else None
                        })
                        
                    except StopIteration as stop_error:
                        print(f"Генерация остановлена: {str(stop_error)}")
                        generation_result.set_error(str(stop_error))
                    except Exception as gen_error:
                        print(f"Ошибка при генерации: {str(gen_error)}")
                        mlflow.log_param("error", str(gen_error))
                        generation_result.set_error(str(gen_error))
            except Exception as e:
                print(f"Ошибка в потоке генерации для IP {client_ip}: {str(e)}")
                generation_result.set_error(str(e))
            finally:
                # Очищаем статус в Redis после завершения
                delete_generation_status(client_ip)
                print(f"Генерация завершена для IP {client_ip}")
        
        thread = threading.Thread(target=generate_in_thread)
        generation_thread = thread
        thread.start()
        
        print(f"Генерация запущена для IP {client_ip}")
        
        # Ждем немного, чтобы получить первое значение из логов
        time.sleep(0.5)
        
        # Пытаемся получить начальное время из логов
        remaining_minutes = None
        try:
            if os.path.exists('generation.log'):
                with open('generation.log', 'r') as f:
                    lines = f.readlines()
                    for line in reversed(lines):
                        if '%, ' in line and 'it/s]' in line:
                            time_match = re.search(r'<(\d+):(\d+)', line)
                            if time_match:
                                minutes = int(time_match.group(1))
                                seconds = int(time_match.group(2))
                                remaining_minutes = round((minutes + seconds / 60), 1)
                                break
        except Exception as e:
            print(f"Ошибка при чтении начального времени из лога: {str(e)}")
        
        return jsonify({
            'status': 'processing',
            'message': 'Генерация запущена успешно',
            'remainingMinutes': remaining_minutes if remaining_minutes is not None else 2.0
        })
            
    except Exception as e:
        print(f"Ошибка при запуске генерации: {str(e)}")  # Добавляем логирование ошибки
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/generation-status', methods=['GET'])
def get_generation_status_endpoint():
    client_ip = get_client_ip()
    print(f"Запрос статуса от IP: {client_ip}")
    
    # Получаем статус из Redis
    status = get_generation_status(client_ip)
    if not status or not status.get('active', False):
        try:
            result = generation_result.get()
            # Очищаем статус после успешного завершения
            delete_generation_status(client_ip)
            return jsonify({
                'status': 'completed',
                'result': result
            })
        except Exception as e:
            # Очищаем статус в случае ошибки
            delete_generation_status(client_ip)
            return jsonify({
                'status': 'error',
                'message': str(e)
            })
    
    # Возвращаем прогресс из Redis
    progress = status.get('progress', current_progress)
    
    return jsonify({
        'status': 'processing',
        'progress': (progress['step'] / progress['total']) * 100,
        'remainingMinutes': progress['remaining_minutes']
    })

@app.route('/cancel-generation', methods=['POST'])
def cancel_generation():
    global cancel_requested
    
    client_ip = get_client_ip()
    print(f"Запрос на отмену от IP: {client_ip}")
    
    # Проверяем статус в Redis
    status = get_generation_status(client_ip)
    if not status or not status.get('active', False):
        return jsonify({
            'status': 'error',
            'message': 'Нет активных задач генерации'
        }), 404
    
    try:
        cancel_requested = True
        print(f"Получен запрос на отмену генерации от IP {client_ip}")
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Очищаем статус генерации в Redis
        delete_generation_status(client_ip)
        print(f"Статус очищен для IP {client_ip} после отмены")
        
        return jsonify({
            'status': 'success',
            'message': 'Запрос на отмену генерации отправлен'
        })
    except Exception as e:
        print(f"Ошибка при отмене генерации для IP {client_ip}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/recent-images')
def get_recent_images():
    try:
        # Получаем список изображений из бакета напрямую
        print("Получение списка изображений из бакета...")
        try:
            objects = s3.list_objects_v2(Bucket=BUCKET_NAME)
            
            if 'Contents' not in objects:
                print("Бакет пуст или ошибка доступа")
                return jsonify({
                    'status': 'success',
                    'images': []
                })
                
            # Фильтруем только PNG файлы
            image_files = [obj for obj in objects['Contents'] 
                          if obj['Key'].endswith('.png')]
            
            # Сортировка по имени файла (извлекаем дату)
            image_files.sort(key=lambda x: get_timestamp_from_filename(x['Key']), reverse=True)
            
            # Берем только 20 последних изображений
            recent_images = []
            for obj in image_files[:20]:
                filename = obj['Key']
                # Создаем URL для доступа к изображению
                url = f"https://storage.yandexcloud.net/{BUCKET_NAME}/{filename}"
                
                # Пытаемся получить prompt из MLflow, если доступно
                prompt = "Сгенерированное изображение"
                try:
                    # Получаем ID эксперимента
                    experiment = mlflow.get_experiment_by_name("stable")
                    if experiment:
                        # Ищем запуск с таким именем файла
                        runs = mlflow.search_runs(
                            experiment_ids=[experiment.experiment_id], 
                            filter_string=f"params.image_filename = '{filename}'"
                        )
                        if not runs.empty:
                            run = runs.iloc[0]
                            if "params.prompt" in run:
                                prompt = run["params.prompt"]
                except Exception as mlflow_error:
                    print(f"Ошибка при получении данных из MLflow: {str(mlflow_error)}")
                
                recent_images.append({
                    "url": url,
                    "prompt": prompt
                })
            
            print(f"Обработано {len(recent_images)} изображений")
            return jsonify({
                'status': 'success',
                'images': recent_images
            })
            
        except Exception as s3_error:
            print(f"Ошибка при получении списка объектов из бакета: {str(s3_error)}")
            # Пытаемся использовать метод из MLflow как резервный вариант
            raise s3_error
            
    except Exception as e:
        # Если произошла ошибка при получении из S3, пробуем получить из MLflow
        try:
            # Получаем ID эксперимента
            experiment = mlflow.get_experiment_by_name("stable")
            if not experiment:
                print("Эксперимент 'stable' не найден")
                return jsonify({
                    'status': 'success',
                    'images': []
                })
                
            # Получаем последние 10 изображений
            recent_images = []
            runs = mlflow.search_runs(experiment_ids=[experiment.experiment_id], order_by=["start_time DESC"], max_results=10)
            print(f"Найдено {len(runs)} запусков")
            
            for _, run in runs.iterrows():
                try:
                    # Получаем параметры из столбцов DataFrame
                    filename = run["params.image_filename"] if "params.image_filename" in run else None
                    prompt = run["params.prompt"] if "params.prompt" in run else "Неизвестный промпт"
                    
                    if filename:
                        # Проверяем, существует ли файл в бакете
                        try:
                            s3.head_object(Bucket=BUCKET_NAME, Key=filename)
                            recent_images.append({
                                "url": f"https://storage.yandexcloud.net/{BUCKET_NAME}/{filename}",
                                "prompt": prompt
                            })
                        except:
                            # Если файла нет в бакете, загружаем его
                            local_path = os.path.join(ARTIFACTS_DIR, filename)
                            if os.path.exists(local_path):
                                try:
                                    s3.upload_file(
                                        local_path,
                                        BUCKET_NAME,
                                        filename,
                                        ExtraArgs={'ACL': 'public-read'}
                                    )
                                    recent_images.append({
                                        "url": f"https://storage.yandexcloud.net/{BUCKET_NAME}/{filename}",
                                        "prompt": prompt
                                    })
                                    print(f"Загружено в Yandex Object Storage: {filename}")
                                except Exception as s3_error:
                                    print(f"Ошибка при загрузке {filename} в Yandex Object Storage: {str(s3_error)}")
                except Exception as run_error:
                    print(f"Ошибка при обработке запуска: {str(run_error)}")
                    continue
            
            print(f"Обработано {len(recent_images)} изображений из MLflow")
            return jsonify({
                'status': 'success',
                'images': recent_images
            })
        except Exception as mlflow_error:
            print(f"Ошибка при получении изображений из MLflow: {str(mlflow_error)}")
            print(f"Тип ошибки: {type(mlflow_error)}")
            return jsonify({
                'status': 'error',
                'message': str(e) + " / " + str(mlflow_error)
            }), 500

@app.route('/images/<filename>')
def get_image(filename):
    try:
        return send_from_directory(ARTIFACTS_DIR, filename)
    except Exception as e:
        print(f"Ошибка при получении изображения {filename}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 404

@app.route('/last-image', methods=['GET'])
def get_last_image():
    client_ip = get_client_ip()
    print(f"Запрос последнего изображения для IP: {client_ip}")
    print(f"Доступные IP: {list(last_images_by_ip.keys())}")
    
    if client_ip in last_images_by_ip:
        return jsonify({
            'status': 'success',
            'image': last_images_by_ip[client_ip]
        })
    return jsonify({
        'status': 'error',
        'message': 'Нет сгенерированных изображений для этого IP адреса'
    })

if __name__ == "__main__":
    print("Starting server on port 5002...")
    
    # Проверяем подключение к MLflow
    try:
        mlflow.search_experiments()
        print("MLflow подключение успешно")
    except Exception as e:
        print(f"Ошибка подключения к MLflow: {str(e)}")
        print("Убедитесь, что MLflow сервер запущен на http://localhost:5000")
        exit(1)
        
    # Загружаем последние изображения при запуске
    load_last_images()
    
    app.run(host='0.0.0.0', port=5002)
