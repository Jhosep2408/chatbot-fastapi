// frontend/script.js
class ChatbotUI {
    constructor() {
        // Configuración
        this.backendUrl = 'https://chatbot-fastapi-4vem.onrender.com';
        this.userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Elementos del DOM
        this.elements = {
            chatBox: document.getElementById('chatBox'),
            userInput: document.getElementById('userInput'),
            sendButton: document.getElementById('sendButton'),
            clearButton: document.getElementById('clearButton'),
            clearHistoryButton: document.getElementById('clearHistoryButton'),
            infoButton: document.getElementById('infoButton'),
            themeToggle: document.getElementById('themeToggle'),
            exportChat: document.getElementById('exportChat'),
            searchButton: document.getElementById('searchButton'),
            searchPanel: document.getElementById('searchPanel'),
            searchInput: document.getElementById('searchInput'),
            searchClose: document.getElementById('searchClose'),
            searchResults: document.getElementById('searchResults'),
            modelStatus: document.getElementById('modelStatus'),
            currentModelInfo: document.getElementById('currentModelInfo'),
            historyCounter: document.getElementById('historyCounter'),
            connectionDot: document.getElementById('connectionDot'),
            connectionStatus: document.getElementById('connectionStatus'),
            sessionTimer: document.getElementById('sessionTimer'),
            messageCounter: document.getElementById('messageCounter'),
            currentTime: document.getElementById('currentTime'),
            versionInfo: document.getElementById('versionInfo'),
            viewSource: document.getElementById('viewSource'),
            viewDocs: document.getElementById('viewDocs'),
            infoModal: document.getElementById('infoModal'),
            exportModal: document.getElementById('exportModal'),
            exportCancel: document.getElementById('exportCancel'),
            exportConfirm: document.getElementById('exportConfirm'),
            exportPreview: document.getElementById('exportPreview'),
            closeModal: document.querySelector('.close'),
            exportClose: document.querySelector('.export-close'),
            notificationContainer: document.getElementById('notificationContainer')
        };

        // New UI elements
        this.elements.hamburgerBtn = document.getElementById('hamburgerBtn');
        this.elements.sidebar = document.querySelector('.sidebar');
        this.elements.sidebarBackdrop = document.getElementById('sidebarBackdrop');

        // Sidebar elements (conversaciones)
        this.elements.conversationList = document.getElementById('conversationList');
        this.elements.newConversationBtn = document.getElementById('newConversation');
        
        // Estado de la aplicación
        this.state = {
            isLoading: false,
            messageCount: 0,
            historyCount: 0,
            isConnected: false,
            isDarkMode: localStorage.getItem('darkMode') === 'true',
            sessionStartTime: new Date(),
            lastActivity: new Date(),
            notifications: [],
            searchOpen: false,
            currentModel: 'Cargando...',
            backendStatus: 'checking',
            typingTimeout: null,
            loadingInterval: null
        };

        // Conversaciones in-memory
        this.state.conversations = [];
        this.state.currentConversationId = null;
        
        // Inicializar
        this.init();
    }

    /* ---------- Conversaciones (sidebar) ---------- */
    createInitialConversation() {
        const id = 'conv_' + Date.now();
        this.state.conversations.push({ id, title: 'Conversación nueva', messages: [] });
        this.state.currentConversationId = id;
    }

    createNewConversation() {
        const id = 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
        const conv = { id, title: 'Conversación ' + (this.state.conversations.length + 1), messages: [] };
        this.state.conversations.unshift(conv);
        this.state.currentConversationId = id;
        this.renderConversationList();
        this.renderConversationMessages(conv);
        this.showNotification('✨ Nueva conversación creada', 'info');
    }

    renderConversationList() {
        const list = this.elements.conversationList;
        if (!list) return;
        list.innerHTML = '';
        this.state.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item' + (conv.id === this.state.currentConversationId ? ' active' : '');
            item.dataset.id = conv.id;
            item.innerHTML = `
                <div>
                    <div class="conversation-title">${this.escapeHtml(conv.title)}</div>
                    <div class="conversation-meta">${conv.messages.length} mensajes</div>
                </div>
            `;
            item.addEventListener('click', () => this.switchConversation(conv.id));
            list.appendChild(item);
        });
    }

    switchConversation(id) {
        const conv = this.state.conversations.find(c => c.id === id);
        if (!conv) return;
        this.state.currentConversationId = id;
        this.renderConversationList();
        this.renderConversationMessages(conv);
        this.showNotification('🔁 Conversación cargada', 'info');
        // On small screens, close the sidebar after switching
        this.toggleSidebar(false);
    }

    saveMessageToConversation(text, sender) {
        const id = this.state.currentConversationId;
        if (!id) return;
        const conv = this.state.conversations.find(c => c.id === id);
        if (!conv) return;
        conv.messages.push({ sender, text, time: new Date().toISOString() });
        this.renderConversationList();
    }

    renderConversationMessages(conv) {
        // Limpiar chat visual y volver a generar mensajes (dejando el welcome)
        this.elements.chatBox.innerHTML = '';
        // Reusar el bloque de bienvenida simple
        const welcomeHtml = `<div class="message bot-message welcome-message">
                    <div class="avatar"><i class="fas fa-robot"></i></div>
                    <div class="content"><p>¡Hola! Soy un chatbot de IA creado como proyecto de portafolio. Puedo ayudarte con:</p><span class="timestamp">Ahora</span></div>
                </div>`;
        const div = document.createElement('div');
        div.innerHTML = welcomeHtml;
        this.elements.chatBox.appendChild(div.firstElementChild);

        // Render mensajes guardados
        conv.messages.forEach(m => this.addMessage(m.text, m.sender, false));
        this.scrollToBottom();
    }

    renderConversationList() {
        const list = this.elements.conversationList;
        if (!list) return;
        list.innerHTML = '';
        this.state.conversations.forEach(conv => {
            const item = document.createElement('div');
            item.className = 'conversation-item' + (conv.id === this.state.currentConversationId ? ' active' : '');
            item.dataset.id = conv.id;

            const left = document.createElement('div');
            left.style.display = 'flex';
            left.style.flexDirection = 'column';
            left.innerHTML = `<div class="conversation-title">${this.escapeHtml(conv.title)}</div><div class="conversation-meta">${conv.messages.length} mensajes</div>`;

            const actions = document.createElement('div');
            actions.className = 'conv-actions';

            const del = document.createElement('button');
            del.className = 'delete-btn';
            del.title = 'Eliminar conversación';
            del.innerHTML = '<i class="fas fa-trash"></i>';
            del.addEventListener('click', async (e) => {
                e.stopPropagation();
                const confirmed = await this.confirmAction('Eliminar conversación', '¿Eliminar esta conversación?');
                if (confirmed) this.deleteConversation(conv.id);
            });

            actions.appendChild(del);

            item.appendChild(left);
            item.appendChild(actions);

            item.addEventListener('click', () => this.switchConversation(conv.id));

            list.appendChild(item);
        });
    }

    deleteConversation(id) {
        const idx = this.state.conversations.findIndex(c => c.id === id);
        if (idx === -1) return;
        const wasCurrent = this.state.currentConversationId === id;
        this.state.conversations.splice(idx, 1);

        if (this.state.conversations.length === 0) {
            this.createInitialConversation();
        }

        if (wasCurrent) {
            // select a nearby conversation
            const newIdx = Math.min(idx, this.state.conversations.length - 1);
            const newConv = this.state.conversations[newIdx];
            this.state.currentConversationId = newConv.id;
            this.renderConversationMessages(newConv);
        }

        this.renderConversationList();
        this.showNotification('🗑️ Conversación eliminada', 'info');
    }
    
    init() {
        console.log('🚀 Inicializando Chatbot UI Professional v2.0');
        
        // Configurar tema inicial
        this.setupTheme();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Configurar temporizadores
        this.setupTimers();
        
        // Verificar conexión
        this.checkBackendConnection();
        // Inicializar conversaciones
        this.createInitialConversation();
        this.renderConversationList();
        const initial = this.state.conversations.find(c => c.id === this.state.currentConversationId);
        if (initial) this.renderConversationMessages(initial);
        
        // Actualizar UI inicial
        this.updateUI();
        
        // Configurar atajos de teclado globales
        this.setupKeyboardShortcuts();
        
        console.log(`✅ Sesión iniciada - ID: ${this.userId}`);
    }
    
    setupTheme() {
        if (this.state.isDarkMode) {
            document.body.classList.add('dark-mode');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            this.elements.themeToggle.title = 'Cambiar a modo claro';
        } else {
            document.body.classList.remove('dark-mode');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            this.elements.themeToggle.title = 'Cambiar a modo oscuro';
        }
    }
    
    setupEventListeners() {
        // Eventos principales
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Eventos de control
        this.elements.clearButton.addEventListener('click', () => this.clearChat());
        this.elements.clearHistoryButton.addEventListener('click', () => this.clearHistory());
        this.elements.infoButton.addEventListener('click', () => this.showInfoModal());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.exportChat.addEventListener('click', () => this.showExportModal());
        this.elements.searchButton.addEventListener('click', () => this.toggleSearch());
        
        // Eventos de búsqueda
        this.elements.searchInput.addEventListener('input', () => this.performSearch());
        this.elements.searchClose.addEventListener('click', () => this.toggleSearch(false));
        
        // Eventos de modal
        this.elements.closeModal?.addEventListener('click', () => this.hideInfoModal());
        this.elements.exportClose?.addEventListener('click', () => this.hideExportModal());
        this.elements.exportCancel?.addEventListener('click', () => this.hideExportModal());
        this.elements.exportConfirm?.addEventListener('click', () => this.exportConversation());
        // Nuevo botón de conversación
        this.elements.newConversationBtn?.addEventListener('click', () => this.createNewConversation());

        // Hamburger / sidebar toggle for mobile
        this.elements.hamburgerBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleSidebar(true);
        });

        // Backdrop click closes sidebar
        this.elements.sidebarBackdrop?.addEventListener('click', () => this.toggleSidebar(false));
        
        // Eventos de enlaces
        this.elements.viewSource?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('🔗 Enlace al código fuente (simulado)', 'info');
        });
        
        this.elements.viewDocs?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showNotification('📚 Enlace a documentación (simulado)', 'info');
        });
        
        // Cerrar modales al hacer clic fuera
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.infoModal) this.hideInfoModal();
            if (e.target === this.elements.exportModal) this.hideExportModal();
        });
        
        // Autoajustar altura del textarea
        this.elements.userInput.addEventListener('input', () => {
            this.elements.userInput.style.height = 'auto';
            this.elements.userInput.style.height = Math.min(this.elements.userInput.scrollHeight, 200) + 'px';
            this.state.lastActivity = new Date();
        });
        
        // Detectar inactividad
        setInterval(() => {
            const inactiveTime = (new Date() - this.state.lastActivity) / 1000 / 60;
            if (inactiveTime > 5) {
                this.state.lastActivity = new Date();
                this.showNotification('💤 Chat inactivo', 'info');
            }
        }, 300000); // 5 minutos
    }
    
    setupTimers() {
        // Actualizar temporizador de sesión
        setInterval(() => {
            const duration = Math.floor((new Date() - this.state.sessionStartTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            this.elements.sessionTimer.textContent = `Sesión: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
        
        // Actualizar hora actual
        setInterval(() => {
            const now = new Date();
            this.elements.currentTime.textContent = now.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
        }, 1000);
        
        // Efecto de escritura en placeholder
        this.setupPlaceholderEffect();
    }
    
    setupPlaceholderEffect() {
        const placeholders = [
            "Escribe tu mensaje aquí...",
            "¿En qué puedo ayudarte hoy?",
            "Pregúntame sobre programación, IA, o tecnología...",
            "¡Hazme cualquier pregunta!"
        ];
        
        let currentPlaceholder = 0;
        let charIndex = 0;
        let isDeleting = false;
        let typingSpeed = 50;
        
        const type = () => {
            const placeholder = placeholders[currentPlaceholder];
            
            if (isDeleting) {
                this.elements.userInput.placeholder = placeholder.substring(0, charIndex - 1);
                charIndex--;
                typingSpeed = 30;
            } else {
                this.elements.userInput.placeholder = placeholder.substring(0, charIndex + 1);
                charIndex++;
                typingSpeed = 50;
            }
            
            if (!isDeleting && charIndex === placeholder.length) {
                isDeleting = true;
                typingSpeed = 1000;
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
                typingSpeed = 500;
            }
            
            setTimeout(type, typingSpeed);
        };
        
        // Iniciar después de 1 segundo
        setTimeout(() => {
            if (!this.elements.userInput.matches(':focus')) {
                type();
            }
        }, 1000);
        
        // Pausar efecto cuando el input tiene foco
        this.elements.userInput.addEventListener('focus', () => {
            this.elements.userInput.placeholder = "Escribe tu mensaje aquí... (Ctrl+Enter para enviar)";
        });
        
        this.elements.userInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!this.elements.userInput.matches(':focus')) {
                    type();
                }
            }, 1000);
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Enter para enviar
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Ctrl+K para buscar
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.toggleSearch();
            }
            
            // Ctrl+L para limpiar pantalla
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.clearChat();
            }
            
            // Ctrl+D para limpiar historial
            if (e.ctrlKey && e.key === 'd') {
                e.preventDefault();
                this.clearHistory();
            }
            
            // Esc para cerrar modales
            if (e.key === 'Escape') {
                this.hideInfoModal();
                this.hideExportModal();
                this.toggleSearch(false);
                this.toggleSidebar(false);
            }
            
            // Ctrl+Shift+T para cambiar tema
            if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
    
    async checkBackendConnection() {
        try {
            this.updateConnectionStatus('connecting', 'Conectando...');
            
            const response = await fetch(`${this.backendUrl}/health`, {
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const data = await response.json();
                this.state.currentModel = data.model;
                this.state.isConnected = true;
                this.state.backendStatus = 'connected';
                
                this.updateConnectionStatus('connected', 'Conectado');
                this.elements.modelStatus.textContent = `Modelo: ${data.model}`;
                this.elements.modelStatus.style.color = '#10b981';
                
                if (this.elements.currentModelInfo) {
                    this.elements.currentModelInfo.textContent = `${data.model} (Groq Cloud)`;
                }
                
                if (data.features && data.features.includes('historial-conversacion')) {
                    this.showNotification('✅ Historial de conversación activado', 'success');
                }
                
                this.showNotification('✅ Backend conectado correctamente', 'success');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Error conectando al backend:', error);
            this.state.isConnected = false;
            this.state.backendStatus = 'disconnected';
            
            this.updateConnectionStatus('disconnected', 'Desconectado');
            this.elements.modelStatus.textContent = 'Backend no disponible';
            this.elements.modelStatus.style.color = '#ef4444';
            
            this.showNotification('❌ No se puede conectar al backend. Verifica que esté ejecutándose.', 'error');
            
            // Reintentar conexión después de 10 segundos
            setTimeout(() => this.checkBackendConnection(), 10000);
        }
    }
    
    updateConnectionStatus(status, message) {
        this.elements.connectionDot.className = `connection-dot ${status}`;
        this.elements.connectionStatus.textContent = message;
        
        const colors = {
            connecting: '#f59e0b',
            connected: '#10b981',
            disconnected: '#ef4444'
        };
        
        this.elements.connectionStatus.style.color = colors[status];
    }
    
    async sendMessage() {
        const message = this.elements.userInput.value.trim();
        
        // Validaciones
        if (!message) {
            this.showError('Por favor, escribe un mensaje');
            return;
        }
        
        if (!this.state.isConnected) {
            this.showError('No hay conexión con el backend. Verifica que esté ejecutándose.');
            return;
        }
        
        if (this.state.isLoading) return;
        
        // Mostrar mensaje del usuario
        this.addMessage(message, 'user');
        this.state.messageCount++;
        this.updateMessageCounter();
        
        // Limpiar y resetear input
        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';
        
        // Mostrar indicador de carga
        this.showLoading();
        this.state.isLoading = true;
        this.elements.sendButton.disabled = true;
        
        try {
            // Enviar mensaje al backend
            const response = await fetch(`${this.backendUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    user_id: this.userId
                })
            });
            
            const data = await response.json();
            
            // Remover indicador de carga
            this.removeLoading();
            
            if (data.success) {
                // Mostrar respuesta del chatbot
                this.addMessage(data.response, 'bot');
                this.state.messageCount++;
                this.updateMessageCounter();
                
                // Actualizar contador de historial
                if (data.history_length !== undefined) {
                    this.state.historyCount = data.history_length;
                    this.updateHistoryCounter();
                }
                
                // Mostrar notificación de éxito
                this.showNotification('✅ Respuesta recibida', 'success');
            } else {
                // Mostrar error del servidor
                this.showError(data.error || 'Error desconocido del servidor');
            }
            
        } catch (error) {
            console.error('Error al enviar mensaje:', error);
            this.removeLoading();
            this.showError('Error de conexión. Verifica tu conexión a internet y que el backend esté ejecutándose.');
        } finally {
            this.state.isLoading = false;
            this.elements.sendButton.disabled = false;
            this.state.lastActivity = new Date();
            this.elements.userInput.focus();
        }
    }
    
    addMessage(text, sender, save = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        
        const time = new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        // Formatear texto (mantener saltos de línea, detectar código, etc.)
        const formattedText = this.formatMessageText(text);
        
        messageDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="content">
                ${formattedText}
                <span class="timestamp">${time}</span>
            </div>
        `;
        
        this.elements.chatBox.appendChild(messageDiv);
        this.scrollToBottom();
        
        // Agregar animación de entrada
        setTimeout(() => {
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        }, 10);
        
        // Agregar a resultados de búsqueda si está abierto
        if (this.state.searchOpen) {
            this.performSearch();
        }

        // Guardar en la conversación actual (si corresponde)
        if (save) {
            try { this.saveMessageToConversation(text, sender); } catch (e) { console.warn(e); }
        }
    }
    
    formatMessageText(text) {
        // Escapar HTML
        let formatted = this.escapeHtml(text);
        
        // Convertir saltos de línea a <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Detectar y formatear código en línea
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Detectar bloques de código (```code```)
        formatted = formatted.replace(/```([\s\S]*?)```/g, (match, code) => {
            return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
        });
        
        // Detectar enlaces y convertirlos
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formatted = formatted.replace(urlRegex, url => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="message-link">${url}</a>`;
        });
        
        // Detectar listas
        formatted = formatted.replace(/^\s*[\-\*]\s+(.+)$/gm, '<li>$1</li>');
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Detectar títulos
        formatted = formatted.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
        formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
        formatted = formatted.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
        
        return `<p>${formatted}</p>`;
    }
    
    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot-message loading';
        loadingDiv.id = 'loadingMessage';
        
        loadingDiv.innerHTML = `
            <div class="avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="content">
                <div class="loading-dots">
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                </div>
                <span class="timestamp">Escribiendo...</span>
            </div>
        `;
        
        this.elements.chatBox.appendChild(loadingDiv);
        this.scrollToBottom();
    }
    
    removeLoading() {
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        if (this.state.loadingInterval) {
            clearInterval(this.state.loadingInterval);
            this.state.loadingInterval = null;
        }
    }
    
    async clearHistory() {
        const confirmed = await this.confirmAction(
            'Limpiar historial',
            '¿Estás seguro de que quieres limpiar el historial de conversación?\n\nEl chatbot "olvidará" todo el contexto anterior y comenzará una nueva conversación.'
        );
        if (!confirmed) return;
        
        try {
            const response = await fetch(`${this.backendUrl}/clear-history`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('✅ Historial limpiado correctamente', 'success');
                this.state.historyCount = 0;
                this.updateHistoryCounter();

                // Limpiar mensajes de la conversación actual en memoria y UI
                const currentId = this.state.currentConversationId;
                const conv = this.state.conversations.find(c => c.id === currentId);
                if (conv) {
                    conv.messages = [];
                    this.renderConversationMessages(conv);
                }

                // Agregar mensaje informativo al chat
                this.addMessage('Historial de conversación limpiado. Comenzando nueva conversación.', 'bot');
            } else {
                this.showError('Error al limpiar historial: ' + data.error);
            }
        } catch (error) {
            console.error('Error al limpiar historial:', error);
            this.showError('Error de conexión al limpiar historial');
        }
    }
    
    async clearChat() {
        const messages = this.elements.chatBox.children;
        if (messages.length <= 1) return;
        
        // Usar SweetAlert confirmation
        const confirmed = await this.confirmAction(
            'Limpiar pantalla',
            '¿Estás seguro de que quieres limpiar toda la conversación visual?\n\nEsto solo borrará los mensajes de la pantalla, pero el chatbot mantendrá el historial en memoria.'
        );
        if (!confirmed) return;
        
        // Mantener solo el primer mensaje (el de bienvenida)
        const welcomeMessage = messages[0];
        this.elements.chatBox.innerHTML = '';
        this.elements.chatBox.appendChild(welcomeMessage);
        
        // Agregar mensaje informativo
        this.addMessage('Conversación visual limpiada. El historial del chatbot se mantiene.', 'bot');
        
        this.showNotification('🗑️ Chat limpiado', 'info');
    }
    
    toggleSearch(show = !this.state.searchOpen) {
        this.state.searchOpen = show;
        this.elements.searchPanel.style.display = show ? 'block' : 'none';
        
        if (show) {
            this.elements.searchInput.focus();
            this.performSearch();
        } else {
            this.elements.searchInput.value = '';
            this.clearSearchHighlights();
        }
    }
    
    performSearch() {
        const query = this.elements.searchInput.value.toLowerCase().trim();
        const messages = this.elements.chatBox.children;
        this.elements.searchResults.innerHTML = '';
        
        if (!query) {
            this.clearSearchHighlights();
            return;
        }
        
        let results = [];
        
        // Buscar en todos los mensajes excepto el primero (bienvenida)
        for (let i = 1; i < messages.length; i++) {
            const message = messages[i];
            const content = message.querySelector('.content p')?.textContent || '';
            
            if (content.toLowerCase().includes(query)) {
                const sender = message.classList.contains('user-message') ? 'Usuario' : 'Chatbot';
                const time = message.querySelector('.timestamp')?.textContent || '';
                
                // Resaltar en el chat
                message.style.backgroundColor = '#fff3cd';
                message.classList.add('search-highlight');
                
                // Agregar a resultados
                const resultDiv = document.createElement('div');
                resultDiv.className = 'search-result';
                resultDiv.innerHTML = `
                    <div><strong>${sender}</strong> <small>${time}</small></div>
                    <div class="search-preview">${this.highlightText(content, query)}</div>
                `;
                
                resultDiv.addEventListener('click', () => {
                    message.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    message.style.animation = 'pulse 0.5s ease-in-out';
                    setTimeout(() => {
                        message.style.animation = '';
                    }, 500);
                });
                
                this.elements.searchResults.appendChild(resultDiv);
                results.push(message);
            } else {
                message.style.backgroundColor = '';
                message.classList.remove('search-highlight');
            }
        }
        
        // Actualizar contador de resultados
        if (results.length > 0) {
            const resultsTitle = document.createElement('div');
            resultsTitle.className = 'search-results-title';
            resultsTitle.textContent = `${results.length} resultado${results.length !== 1 ? 's' : ''} encontrado${results.length !== 1 ? 's' : ''}`;
            this.elements.searchResults.prepend(resultsTitle);
        }
    }
    
    clearSearchHighlights() {
        const messages = this.elements.chatBox.querySelectorAll('.search-highlight');
        messages.forEach(msg => {
            msg.style.backgroundColor = '';
            msg.classList.remove('search-highlight');
        });
    }
    
    highlightText(text, query) {
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    toggleSidebar(show = null) {
        // if show is null -> toggle
        const willOpen = show === null ? !this.elements.sidebar?.classList.contains('open') : !!show;

        if (!this.elements.sidebar) return;

        if (willOpen) {
            this.elements.sidebar.classList.add('open');
            this.elements.sidebarBackdrop?.classList.remove('hidden');
            this.elements.sidebarBackdrop?.classList.add('visible');
            // prevent body scroll when sidebar open on mobile
            document.body.style.overflow = 'hidden';
        } else {
            this.elements.sidebar.classList.remove('open');
            this.elements.sidebarBackdrop?.classList.remove('visible');
            this.elements.sidebarBackdrop?.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    toggleTheme() {
        this.state.isDarkMode = !this.state.isDarkMode;
        localStorage.setItem('darkMode', this.state.isDarkMode);
        
        this.setupTheme();
        
        const theme = this.state.isDarkMode ? 'oscuro' : 'claro';
        this.showNotification(`🌓 Modo ${theme} activado`, 'info');
    }
    
    showInfoModal() {
        // Actualizar información en tiempo real
        this.elements.currentModelInfo.textContent = `${this.state.currentModel} (Groq Cloud)`;
        
        this.elements.infoModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    hideInfoModal() {
        this.elements.infoModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    showExportModal() {
        // Generar vista previa
        this.generateExportPreview();
        
        this.elements.exportModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
    
    hideExportModal() {
        this.elements.exportModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
    
    generateExportPreview() {
        const messages = this.elements.chatBox.children;
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'txt';
        
        let preview = '';
        
        switch (format) {
            case 'txt':
                preview = this.formatExportTXT(messages);
                break;
            case 'json':
                preview = this.formatExportJSON(messages);
                break;
            case 'html':
                preview = this.formatExportHTML(messages);
                break;
        }
        
        this.elements.exportPreview.value = preview;
    }
    
    formatExportTXT(messages) {
        let text = `Chatbot Conversation Export\n`;
        text += `Fecha: ${new Date().toLocaleString()}\n`;
        text += `Usuario: ${this.userId}\n`;
        text += `Modelo: ${this.state.currentModel}\n`;
        text += `Total mensajes: ${this.state.messageCount}\n`;
        text += `='.repeat(50)}\n\n`;
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const sender = message.classList.contains('user-message') ? 'USUARIO' : 'CHATBOT';
            const time = message.querySelector('.timestamp')?.textContent || '';
            const content = message.querySelector('.content p')?.textContent || '';
            
            text += `[${time}] ${sender}:\n`;
            text += `${content}\n\n`;
        }
        
        return text;
    }
    
    formatExportJSON(messages) {
        const conversation = {
            metadata: {
                exportDate: new Date().toISOString(),
                userId: this.userId,
                model: this.state.currentModel,
                messageCount: this.state.messageCount,
                sessionDuration: Math.floor((new Date() - this.state.sessionStartTime) / 1000)
            },
            messages: []
        };
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            conversation.messages.push({
                id: i,
                role: message.classList.contains('user-message') ? 'user' : 'assistant',
                timestamp: message.querySelector('.timestamp')?.textContent || '',
                content: message.querySelector('.content p')?.textContent || ''
            });
        }
        
        return JSON.stringify(conversation, null, 2);
    }
    
    formatExportHTML(messages) {
        let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Chatbot Conversation Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .message { margin: 20px 0; padding: 15px; border-radius: 10px; }
        .user { background: #e3f2fd; margin-left: 40px; }
        .bot { background: #f5f5f5; margin-right: 40px; }
        .timestamp { font-size: 12px; color: #666; margin-top: 5px; }
        .header { background: #4361ee; color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Chatbot Conversation Export</h1>
        <p>Fecha: ${new Date().toLocaleString()} | Usuario: ${this.userId} | Modelo: ${this.state.currentModel}</p>
    </div>`;
        
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const sender = message.classList.contains('user-message') ? 'user' : 'bot';
            const time = message.querySelector('.timestamp')?.textContent || '';
            const content = message.querySelector('.content p')?.textContent || '';
            
            html += `
    <div class="message ${sender}">
        <div><strong>${sender === 'user' ? 'Usuario' : 'Chatbot'}</strong></div>
        <div>${content.replace(/\n/g, '<br>')}</div>
        <div class="timestamp">${time}</div>
    </div>`;
        }
        
        html += `
</body>
</html>`;
        
        return html;
    }
    
    exportConversation() {
        const format = document.querySelector('input[name="exportFormat"]:checked')?.value || 'txt';
        const content = this.elements.exportPreview.value;
        const extension = format === 'html' ? 'html' : format === 'json' ? 'json' : 'txt';
        const filename = `chatbot_conversation_${Date.now()}.${extension}`;
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        
        this.showNotification(`✅ Conversación exportada como ${filename}`, 'success');
        this.hideExportModal();
    }
    
    updateHistoryCounter() {
        if (!this.elements.historyCounter) return;
        
        this.elements.historyCounter.innerHTML = `
            <i class="fas fa-database"></i> Contexto: ${this.state.historyCount} mensajes
        `;
        
        if (this.state.historyCount > 0) {
            this.elements.historyCounter.style.background = 'linear-gradient(135deg, #d1fae5, #a7f3d0)';
            this.elements.historyCounter.style.color = '#065f46';
            this.elements.historyCounter.style.borderColor = '#a7f3d0';
        } else {
            this.elements.historyCounter.style.background = 'var(--gray-100)';
            this.elements.historyCounter.style.color = 'var(--gray-600)';
            this.elements.historyCounter.style.borderColor = 'var(--gray-200)';
        }
    }
    
    updateMessageCounter() {
        this.elements.messageCounter.textContent = `Mensajes: ${this.state.messageCount}`;
    }
    
    updateUI() {
        this.updateHistoryCounter();
        this.updateMessageCounter();
        this.elements.versionInfo.textContent = 'Versión 2.0.0';
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        this.elements.notificationContainer.appendChild(notification);
        
        // Remover después de 5 segundos
        setTimeout(() => {
            notification.style.animation = 'notificationSlideOut 0.3s ease-out forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    async confirmAction(title = 'Confirmar', text = '', icon = 'warning', confirmButtonText = 'Sí', cancelButtonText = 'No') {
        // If SweetAlert2 isn't loaded, fallback to native confirm
        if (typeof Swal === 'undefined') {
            return confirm(text || title);
        }

        const result = await Swal.fire({
            title: title,
            text: text,
            icon: icon,
            showCancelButton: true,
            confirmButtonText: confirmButtonText,
            cancelButtonText: cancelButtonText,
            reverseButtons: true,
            focusCancel: true
        });

        return !!result.isConfirmed;
    }
    
    showError(errorMessage) {
        this.showNotification(errorMessage, 'error');
        
        // También agregar al chat si es un error de conexión
        if (errorMessage.includes('conexión') || errorMessage.includes('backend')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message bot-message error';
            
            errorDiv.innerHTML = `
                <div class="avatar">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                <div class="content">
                    <p><strong>Error:</strong> ${this.escapeHtml(errorMessage)}</p>
                    <span class="timestamp">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            `;
            
            this.elements.chatBox.appendChild(errorDiv);
            this.scrollToBottom();
        }
    }
    
    scrollToBottom() {
        this.elements.chatBox.scrollTop = this.elements.chatBox.scrollHeight;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new ChatbotUI();
    
    // Exponer app globalmente para debugging
    window.chatbotApp = app;
    
    // Agregar estilos adicionales dinámicamente
    const style = document.createElement('style');
    style.textContent = `
        .message-link {
            color: #4361ee;
            text-decoration: underline;
            word-break: break-all;
        }
        
        .message-link:hover {
            color: #3730a3;
        }
        
        mark {
            background-color: #ffd700;
            padding: 1px 3px;
            border-radius: 3px;
        }
        
        .search-results-title {
            padding: 10px;
            background: #f3f4f6;
            border-bottom: 1px solid #e5e7eb;
            font-weight: 600;
            color: #374151;
        }
        
        .search-preview {
            font-size: 0.9em;
            color: #6b7280;
            margin-top: 5px;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        
        @keyframes notificationSlideOut {
            from {
                opacity: 1;
                transform: translateX(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateX(100%) scale(0.8);
            }
        }
    `;
    document.head.appendChild(style);
    
    console.log('🎉 Chatbot Professional inicializado correctamente!');
});
