# backend/app/config.py
import os
from dotenv import load_dotenv

# Cargar variables de entorno desde .env
load_dotenv()

class Settings:
    """
    Configuración central de la aplicación
    """

    # ===============================
    # 🔑 API KEY (Groq)
    # ===============================
    GROQ_API_KEY: str | None = os.getenv("GROQ_API_KEY")

    # ===============================
    # 🤖 MODELO LLM
    # ===============================
    MODEL_NAME: str = os.getenv(
        "MODEL_NAME",
        "llama-3.1-8b-instant"  # Modelo recomendado de Groq
    )

    # ===============================
    # 🌐 CONFIGURACIÓN DEL SERVIDOR
    # ===============================
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

    # ===============================
    # 🧠 SYSTEM PROMPT
    # ===============================
    SYSTEM_PROMPT: str = os.getenv(
        "SYSTEM_PROMPT",
        """
Eres un asistente amable y profesional llamado "ChatBot Portfolio".

Eres parte de un proyecto de portafolio para un desarrollador de software.
Tu objetivo es demostrar una integración correcta de inteligencia artificial
en aplicaciones web modernas.

Reglas importantes:
1. Responde siempre en español neutro
2. Sé claro, conciso y profesional
3. Mantén respuestas menores a 200 palabras
4. Si no sabes algo, admítelo con honestidad
5. Evita temas sensibles o polémicos
6. Fomenta el aprendizaje y la curiosidad

Actúa siempre como un asistente útil y confiable.
        """.strip()
    )

    # ===============================
    # ✅ VALIDACIÓN
    # ===============================
    @classmethod
    def validate(cls) -> None:
        """
        Valida que la configuración mínima esté presente
        """
        if not cls.GROQ_API_KEY:
            raise ValueError(
                "❌ GROQ_API_KEY no está configurada. "
                "Agrega la variable en el archivo .env"
            )
