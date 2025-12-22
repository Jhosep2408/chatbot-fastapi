# Chatbot con IA - Proyecto de Portafolio 2025

![Chatbot Demo](https://img.shields.io/badge/Status-Activo-success)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![License](https://img.shields.io/badge/Licencia-MIT-yellow)

Un chatbot básico con IA diseñado como proyecto demostrativo para portafolio de desarrollador junior. Integra APIs de IA modernas (OpenAI/Groq) con un backend en FastAPI y un frontend simple.

## 🎯 Objetivo del Proyecto

Demostrar habilidades prácticas en:
- Integración de APIs de IA (LLMs)
- Desarrollo backend con FastAPI (Python)
- Creación de interfaces web simples
- Manejo de variables de entorno y seguridad
- Comunicación cliente-servidor mediante REST API

## 🏗️ Arquitectura
Cliente (Frontend) → API REST (FastAPI) → Servicio IA (OpenAI/Groq) → Respuesta

## 🛠️ Tecnologías Usadas

### Backend
- **Python 3.8+**: Lenguaje principal
- **FastAPI**: Framework web moderno y rápido
- **OpenAI SDK / Groq SDK**: Conexión con modelos de IA
- **python-dotenv**: Manejo de variables de entorno
- **Uvicorn**: Servidor ASGI

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con variables CSS y Flexbox
- **JavaScript Vanilla**: Interactividad sin frameworks
- **Font Awesome**: Iconos
- **Google Fonts**: Tipografía Inter

### IA
- **OpenAI GPT-3.5 Turbo** (opción por defecto)
  - Modelo económico y estable
  - Ideal para aplicaciones de chat
  - Costo aproximado: $0.002 por 1K tokens

- **Groq Mixtral 8x7B** (opción alternativa)
  - Modelo de código abierto acelerado
  - Muy rápido en inferencia
  - Gratuito con límites

## 🚀 Cómo Ejecutar el Proyecto

### Prerrequisitos
- Python 3.8 o superior
- Node.js (solo para servir el frontend, opcional)
- Una API Key de OpenAI o Groq

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/chatbot-portfolio-2025.git
cd chatbot-portfolio-2025