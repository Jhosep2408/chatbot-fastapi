# backend/app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from .services.chatbot_service import ChatbotService
from .config import Settings

# Crear instancia de FastAPI
app = FastAPI(
    title="Chatbot Portfolio API",
    description="API para chatbot con IA - Con historial de conversación",
    version="1.1.0"
)

# Configurar CORS para permitir frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especifica el dominio
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar el servicio del chatbot
chatbot_service = ChatbotService()

# Modelos Pydantic para validación
class ChatMessage(BaseModel):
    message: str
    user_id: Optional[str] = "guest"

class ClearHistoryRequest(BaseModel):
    user_id: Optional[str] = "guest"

class ChatResponse(BaseModel):
    success: bool
    response: Optional[str] = None
    error: Optional[str] = None
    model_used: Optional[str] = None
    history_length: Optional[int] = None

class HistoryResponse(BaseModel):
    success: bool
    user_id: Optional[str] = None
    total_messages: Optional[int] = None
    user_messages: Optional[int] = None
    assistant_messages: Optional[int] = None
    recent_topics: Optional[list] = None
    has_conversation: Optional[bool] = None
    error: Optional[str] = None

# Endpoints
@app.get("/")
async def root():
    """Endpoint raíz con información básica."""
    return {
        "message": "Bienvenido al Chatbot API con Historial",
        "version": "1.1.0",
        "description": "Proyecto de portafolio con historial de conversación",
        "endpoints": {
            "GET /": "Esta página",
            "POST /chat": "Enviar mensaje al chatbot (con historial)",
            "GET /health": "Estado del servicio",
            "GET /models": "Modelos disponibles",
            "POST /clear-history": "Limpiar historial de usuario",
            "GET /history/{user_id}": "Obtener resumen del historial"
        }
    }

@app.get("/health")
async def health_check():
    """Verificar que el servicio está funcionando."""
    return {
        "status": "healthy",
        "service": "chatbot-api",
        "model": chatbot_service.model,
        "features": ["historial-conversacion", "multi-usuario"]
    }

@app.get("/models")
async def get_models():
    """Obtener información sobre los modelos disponibles."""
    models = chatbot_service.get_available_models()
    return {
        "models": models,
        "current_model": chatbot_service.model
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(chat_message: ChatMessage):
    """
    Enviar un mensaje al chatbot y obtener respuesta.
    Mantiene el historial de conversación por usuario.
    
    - **message**: El mensaje del usuario (requerido)
    - **user_id**: ID opcional para tracking y historial separado
    """
    try:
        # Obtener respuesta del chatbot con historial
        result = chatbot_service.get_response(
            user_message=chat_message.message,
            user_id=chat_message.user_id
        )
        
        # Si hay error, lanzar excepción HTTP
        if not result["success"]:
            raise HTTPException(
                status_code=400,
                detail=result["error"]
            )
        
        return ChatResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor: {str(e)}"
        )

@app.post("/clear-history")
async def clear_history(request: ClearHistoryRequest):
    """
    Limpiar el historial de conversación de un usuario.
    
    - **user_id**: ID del usuario (opcional, por defecto "guest")
    """
    try:
        result = chatbot_service.clear_history(request.user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=404,
                detail=result["error"]
            )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al limpiar historial: {str(e)}"
        )

@app.get("/history/{user_id}", response_model=HistoryResponse)
async def get_history(user_id: str):
    """
    Obtener un resumen del historial de conversación de un usuario.
    
    - **user_id**: ID del usuario
    """
    try:
        result = chatbot_service.get_conversation_summary(user_id)
        
        if not result["success"]:
            raise HTTPException(
                status_code=404,
                detail=result["error"]
            )
        
        return HistoryResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener historial: {str(e)}"
        )

# Punto de entrada para desarrollo
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=Settings.HOST,
        port=Settings.PORT,
        reload=True
    )