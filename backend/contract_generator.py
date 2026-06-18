import os
import urllib.request
from reportlab.pdfgen import canvas
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from cloudinary_utils import upload_file_to_cloudinary

FONT_URL = "https://github.com/dejavu-fonts/dejavu-fonts/raw/master/ttf/DejaVuSans.ttf"
FONT_PATH = "DejaVuSans.ttf"

def generate_contract_pdf(booking_id: int, client_name: str, mobilographer_name: str, date: str, price: float) -> str:
    """Келісімшарт генерациялап, Cloudinary-ға жүктеп, URL қайтарады"""
    if not os.path.exists(FONT_PATH):
        try:
            urllib.request.urlretrieve(FONT_URL, FONT_PATH)
        except Exception as e:
            print(f"Font download failed: {e}")
            return None
    
    try:
        pdfmetrics.registerFont(TTFont('DejaVu', FONT_PATH))
    except Exception as e:
        print(f"Font register failed: {e}")
        return None
    
    filename = f"contract_{booking_id}.pdf"
    filepath = f"uploads/{filename}"
    
    os.makedirs("uploads", exist_ok=True)
    
    c = canvas.Canvas(filepath)
    c.setFont('DejaVu', 16)
    c.drawString(100, 800, "ҚЫЗМЕТ КӨРСЕТУ КЕЛІСІМШАРТЫ")
    c.setFont('DejaVu', 12)
    c.drawString(100, 760, f"Тапсырыс нөмірі: #{booking_id}")
    c.drawString(100, 740, f"Күні: {date}")
    c.drawString(100, 700, f"Клиент: {client_name}")
    c.drawString(100, 680, f"Мобилограф: {mobilographer_name}")
    c.drawString(100, 660, f"Сомасы: {price} KZT")
    
    c.drawString(100, 600, "Осы келісімшарт тараптардың келісімімен жасалды.")
    c.drawString(100, 580, "Қызмет сапалы әрі уақытында көрсетілуі тиіс.")
    
    c.save()
    
    with open(filepath, "rb") as f:
        file_contents = f.read()
        
    url = upload_file_to_cloudinary(file_contents, resource_type="raw", folder="mobilograph_contracts")
    return url or f"/uploads/{filename}"
