/**
 * chatService.js - Frontend Chat Service
 * 
 * Dit bestand bevat de frontend integratielogica voor de chatbot.
 * Plaats dit in project/frontend/src/services/
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3000`).replace(/\/$/, '');

/**
 * Stuur een chatbericht naar de backend
 * @param {string} message - Het chatbericht
 * @param {object} options - Optionele parameters (userId, etc.)
 * @returns {Promise<object>} Response van de chatbot
 */
export async function sendChatMessage(message, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message.trim(),
                userId: options.userId || null,
                testMode: options.testMode || false
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('Chatbot error:', error);
        return {
            success: false,
            response: 'Sorry, er is een fout opgetreden met de chatbot. Probeer later opnieuw.',
            error: error.message
        };
    }
}

/**
 * Check de status van de chatbot service
 * @returns {Promise<object>} Status informatie
 */
export async function getChatbotStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/chat/status`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('Chatbot status error:', error);
        return {
            available: false,
            error: error.message
        };
    }
}

/**
 * React Hook voor chatbot berichten
 * 
 * Voorbeeld gebruik in React component:
 * 
 * import { useChatBot } from './services/chatService.js'
 * 
 * function ChatComponent() {
 *   const { messages, sendMessage, isLoading } = useChatBot();
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <div key={msg.id} className={msg.type}>
 *           {msg.text}
 *         </div>
 *       ))}
 *       <input 
 *         onKeyPress={e => e.key === 'Enter' && sendMessage(e.target.value)}
 *       />
 *     </div>
 *   );
 * }
 */
export function useChatBot() {
    const [messages, setMessages] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const sendMessage = async (userMessage) => {
        if (!userMessage.trim()) return;

        // Voeg user message toe
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: userMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);

        setIsLoading(true);
        try {
            const response = await sendChatMessage(userMessage);
            
            // Voeg bot response toe
            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: response.response,
                timestamp: new Date(),
                debug: response.debug
            };
            setMessages(prev => [...prev, botMsg]);

        } finally {
            setIsLoading(false);
        }
    };

    return { messages, sendMessage, isLoading };
}
