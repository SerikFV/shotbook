import cloudinary
import cloudinary.uploader
import cloudinary.api
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

# Cloudinary конфигурациясы (.env файлынан алынады)
cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
api_key = os.getenv('CLOUDINARY_API_KEY')
api_secret = os.getenv('CLOUDINARY_API_SECRET')

use_cloudinary = bool(cloud_name and api_key and api_secret and cloud_name != 'demo' and api_key != 'api_key')

if use_cloudinary:
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )

def upload_file_to_cloudinary(file_contents: bytes, resource_type: str = "auto", folder: str = "mobilograph") -> str:
    """Файлды Cloudinary-ға немесе жергілікті папкаға (uploads/) жүктеп, оның URL-ін қайтарады"""
    if use_cloudinary:
        try:
            response = cloudinary.uploader.upload(
                file_contents,
                resource_type=resource_type,
                folder=folder
            )
            return response.get("secure_url")
        except Exception as e:
            print(f"Cloudinary upload error, falling back to local: {e}")

    # Жергілікті папкаға сақтау (Local fallback)
    try:
        os.makedirs("uploads", exist_ok=True)
        # Кеңейтілімді анықтау
        ext = "jpg"
        if resource_type == "video":
            ext = "mp4"
        elif resource_type == "raw":
            ext = "pdf"
            
        prefix = "upload_"
        if "portfolio" in folder:
            prefix = "portfolio_"
        elif "deliveries" in folder:
            prefix = "delivery_"
        elif "contracts" in folder:
            prefix = "contract_"
            
        filename = f"{prefix}{uuid.uuid4()}.{ext}"
        filepath = os.path.join("uploads", filename)
        with open(filepath, "wb") as f:
            f.write(file_contents)
        return f"/uploads/{filename}"
    except Exception as e:
        print(f"Local upload error: {e}")
        return None

