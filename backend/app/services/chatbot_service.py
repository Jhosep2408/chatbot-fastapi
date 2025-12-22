# backend/app/services/chatbot_service.py
import os
from groq import Groq
from typing import Dict, Any, Optional
from ..config import Settings

class ChatbotService:
    def __init__(self):
        """
        Inicializa el servicio del chatbot con la configuración de Groq.
        """
        # Validar que exista la API Key de Groq
        if not Settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY no está configurada")

        self.client = Groq(
            api_key=Settings.GROQ_API_KEY
        )
        
        # Historial de conversación por usuario
        # Estructura: {user_id: [{"role": "system/user/assistant", "content": "..."}, ...]}
        self.conversation_history = {}
        
        # Configuración del modelo
        self.model = Settings.MODEL_NAME
        self.system_prompt = Settings.SYSTEM_PROMPT
        
        # Máximo de mensajes a mantener en el historial (evita sobrecarga)
        self.max_history_messages = 10

    def _initialize_user_history(self, user_id: str) -> None:
        """
        Inicializa el historial de conversación para un usuario.
        
        Args:
            user_id: Identificador único del usuario
        """
        if user_id not in self.conversation_history:
            # Iniciar con el prompt del sistema
            self.conversation_history[user_id] = [
                {"role": "system", "content": self.system_prompt}
            ]

    def _trim_history(self, user_id: str) -> None:
        """
        Limita el historial al número máximo de mensajes configurado.
        Mantiene siempre el mensaje del sistema.
        
        Args:
            user_id: Identificador del usuario
        """
        if user_id in self.conversation_history:
            history = self.conversation_history[user_id]
            
            # Si excede el límite, recortar manteniendo el system prompt
            if len(history) > self.max_history_messages:
                # Mantener el system prompt y los últimos mensajes
                system_message = history[0]  # El primero siempre es system
                recent_messages = history[-(self.max_history_messages-1):]
                self.conversation_history[user_id] = [system_message] + recent_messages

    def clear_history(self, user_id: str = "guest") -> Dict[str, Any]:
        """
        Limpia el historial de conversación de un usuario.
        
        Args:
            user_id: Identificador del usuario (opcional)
            
        Returns:
            Dict con resultado de la operación
        """
        if user_id in self.conversation_history:
            # Reiniciar con solo el system prompt
            self.conversation_history[user_id] = [
                {"role": "system", "content": self.system_prompt}
            ]
            return {
                "success": True,
                "message": f"Historial de conversación limpiado para {user_id}"
            }
        
        return {
            "success": False,
            "error": f"No se encontró historial para {user_id}"
        }

    def get_response(self, user_message: str, user_id: str = "guest") -> Dict[str, Any]:
        """
        Obtiene una respuesta del LLM basada en el mensaje del usuario,
        manteniendo el contexto de la conversación.
        
        Args:
            user_message: El mensaje del usuario
            user_id: Identificador del usuario (para mantener historial separado)
            
        Returns:
            Dict con la respuesta o error
        """
        # Validar mensaje vacío
        if not user_message or not user_message.strip():
            return {
                "success": False,
                "error": "El mensaje no puede estar vacío"
            }

        try:
            # Inicializar historial si es necesario
            self._initialize_user_history(user_id)
            
            # Agregar mensaje del usuario al historial
            self.conversation_history[user_id].append({
                "role": "user",
                "content": user_message
            })
            
            # Obtener respuesta del LLM usando TODO el historial
            response = self.client.chat.completions.create(
                model=self.model,
                messages=self.conversation_history[user_id],
                temperature=0.7,
                max_tokens=300
            )
            
            # Extraer contenido de la respuesta
            assistant_response = response.choices[0].message.content
            
            # Agregar respuesta del asistente al historial
            self.conversation_history[user_id].append({
                "role": "assistant",
                "content": assistant_response
            })
            
            # Recortar historial si es necesario
            self._trim_history(user_id)
            
            return {
                "success": True,
                "response": assistant_response,
                "model_used": self.model,
                "history_length": len(self.conversation_history[user_id]) - 1  # Excluyendo system
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Error al procesar la solicitud: {str(e)}"
            }

    def get_conversation_summary(self, user_id: str = "guest") -> Dict[str, Any]:
        """
        Obtiene un resumen de la conversación actual.
        
        Args:
            user_id: Identificador del usuario
            
        Returns:
            Dict con información del historial
        """
        if user_id not in self.conversation_history:
            return {
                "success": False,
                "error": f"No hay conversación activa para {user_id}"
            }
        
        history = self.conversation_history[user_id]
        
        # Contar tipos de mensajes
        user_messages = sum(1 for msg in history if msg["role"] == "user")
        assistant_messages = sum(1 for msg in history if msg["assistant"] == "assistant")
        
        # Extraer algunos temas (primeras palabras de los mensajes del usuario)
        topics = []
        for msg in history:
            if msg["role"] == "user" and len(msg["content"]) > 0:
                # Tomar las primeras 3 palabras como tema
                words = msg["content"].split()[:3]
                if words:
                    topics.append(" ".join(words) + "...")
                    if len(topics) >= 3:  # Máximo 3 temas
                        break
        
        return {
            "success": True,
            "user_id": user_id,
            "total_messages": len(history) - 1,  # Excluyendo system
            "user_messages": user_messages,
            "assistant_messages": assistant_messages,
            "recent_topics": topics[:3],
            "has_conversation": len(history) > 1  # Más que solo system prompt
        }

    def get_available_models(self) -> list:
        """
        Retorna información sobre los modelos disponibles de Groq.
        
        Returns:
            Lista de diccionarios con información de modelos
        """
        return [
            {
                "provider": "Groq",
                "model": "llama3-70b-8192",
                "description": "Modelo LLaMA 3 de 70B parámetros, alto rendimiento",
                "max_tokens": 8192,
                "cost": "Gratuito con límites (Groq)",
                "recommended_for": "Tareas complejas, razonamiento"
            },
            {
                "provider": "Groq",
                "model": "llama3-8b-8192",
                "description": "Modelo LLaMA 3 de 8B parámetros, rápido y eficiente",
                "max_tokens": 8192,
                "cost": "Gratuito con límites (Groq)",
                "recommended_for": "Chat rápido, respuestas cortas"
            },
            {
                "provider": "Groq",
                "model": "mixtral-8x7b-32768",
                "description": "Modelo Mixtral de 8x7B, experto en múltiples tareas",
                "max_tokens": 32768,
                "cost": "Gratuito con límites (Groq)",
                "recommended_for": "Tareas generales, contexto largo"
            }
        ]