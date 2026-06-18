import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
from dotenv import load_dotenv

load_dotenv()

# Cloudinary конфигурациясы (.env файлынан алынады)
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME', 'demo'),
    api_key=os.getenv('CLOUDINARY_API_KEY', 'api_key'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET', 'api_secret')
)

def upload_file_to_cloudinary(file_contents: bytes, resource_type: str = "auto", folder: str = "mobilograph") -> str:
    """Файлды Cloudinary-ға жүктеп, оның URL-ін қайтарады"""
    try:
        response = cloudinary.uploader.upload(
            file_contents,
            resource_type=resource_type,
            folder=folder
        )
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None
