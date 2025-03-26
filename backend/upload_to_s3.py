import os
import boto3
import botocore
from tqdm import tqdm

# Настройка Yandex Object Storage
session = boto3.session.Session()
s3 = session.client(
    service_name='s3',
    region_name='ru-central1',
    endpoint_url='https://storage.yandexcloud.net',
    aws_access_key_id='${YC_ACCESS_KEY_ID:-your_key_id_here}',
    aws_secret_access_key='${YC_SECRET_ACCESS_KEY:-your_secret_key_here}'
)

BUCKET_NAME = 'vkr-images'
ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")

def upload_images():
    if not os.path.exists(ARTIFACTS_DIR):
        print(f"Директория {ARTIFACTS_DIR} не найдена")
        return

    # Получаем список всех файлов в директории
    files = [f for f in os.listdir(ARTIFACTS_DIR) if f.endswith('.png')]
    print(f"Найдено {len(files)} изображений для загрузки")

    # Загружаем каждый файл
    for filename in tqdm(files, desc="Загрузка изображений"):
        local_path = os.path.join(ARTIFACTS_DIR, filename)
        try:
            # Проверяем, существует ли файл уже в бакете
            try:
                s3.head_object(Bucket=BUCKET_NAME, Key=filename)
                print(f"Файл {filename} уже существует в бакете")
                continue
            except:
                pass

            # Загружаем файл
            s3.upload_file(
                local_path,
                BUCKET_NAME,
                filename,
                ExtraArgs={'ACL': 'public-read'}
            )
            print(f"Успешно загружен: {filename}")
        except Exception as e:
            print(f"Ошибка при загрузке {filename}: {str(e)}")

if __name__ == "__main__":
    print("Начинаем загрузку изображений в Yandex Object Storage...")
    upload_images()
    print("Загрузка завершена") 