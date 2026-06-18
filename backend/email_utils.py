"""Gmail SMTP арқылы email жіберу утилиті"""
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")


def generate_code(length: int = 6) -> str:
    """6 таңбалы сандық код генерациялау"""
    return ''.join(random.choices(string.digits, k=length))


def send_verification_email(to_email: str, code: str, purpose: str = "register") -> bool:
    """
    Email верификация кодын жіберу.
    purpose: "register" | "reset_password"
    """
    if purpose == "register":
        subject = "ShotBook — Email растау коды"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                    background: #0f1729; color: #eef2ff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; justify-content: center;
                            width: 56px; height: 56px; background: #4f8ef7;
                            border-radius: 14px; font-family: sans-serif;
                            font-weight: 800; font-size: 20px; color: white;">SB</div>
                <h1 style="font-size: 22px; margin-top: 16px; color: #eef2ff;">ShotBook</h1>
            </div>
            <h2 style="font-size: 18px; margin-bottom: 12px; color: #eef2ff;">Email растау</h2>
            <p style="color: #7b8ec8; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
                Тіркелуді аяқтау үшін төмендегі растау кодын енгізіңіз.
                Код <strong style="color: #eef2ff;">10 минут</strong> бойы жарамды.
            </p>
            <div style="background: #1a2340; border: 1px solid #1e2a45; border-radius: 12px;
                        padding: 24px; text-align: center; margin-bottom: 28px;">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px;
                            color: #4f8ef7; font-family: monospace;">{code}</div>
            </div>
            <p style="color: #7b8ec8; font-size: 12px; text-align: center;">
                Егер сіз тіркелмеген болсаңыз, бұл хатты елемеңіз.
            </p>
        </div>
        """
    else:  # reset_password
        subject = "ShotBook — Пароль қалпына келтіру коды"
        body_html = f"""
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                    background: #0f1729; color: #eef2ff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 32px;">
                <div style="display: inline-flex; align-items: center; justify-content: center;
                            width: 56px; height: 56px; background: #4f8ef7;
                            border-radius: 14px; font-family: sans-serif;
                            font-weight: 800; font-size: 20px; color: white;">SB</div>
                <h1 style="font-size: 22px; margin-top: 16px; color: #eef2ff;">ShotBook</h1>
            </div>
            <h2 style="font-size: 18px; margin-bottom: 12px; color: #eef2ff;">Пароль қалпына келтіру</h2>
            <p style="color: #7b8ec8; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
                Паролді қалпына келтіру үшін төмендегі кодты енгізіңіз.
                Код <strong style="color: #eef2ff;">10 минут</strong> бойы жарамды.
            </p>
            <div style="background: #1a2340; border: 1px solid #1e2a45; border-radius: 12px;
                        padding: 24px; text-align: center; margin-bottom: 28px;">
                <div style="font-size: 36px; font-weight: 800; letter-spacing: 10px;
                            color: #4f8ef7; font-family: monospace;">{code}</div>
            </div>
            <p style="color: #7b8ec8; font-size: 12px; text-align: center;">
                Егер сіз сұрамаған болсаңыз, бұл хатты елемеңіз.
            </p>
        </div>
        """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ShotBook <{SMTP_USER}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return False
