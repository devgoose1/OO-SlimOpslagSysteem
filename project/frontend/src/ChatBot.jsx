import { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

const ChatBot = ({ user }) => {
    const [messages, setMessages] = useState([
        {
            id: 0,
            type: 'bot',
            text: 'Hallo! 👋 Ik ben je virtuele assistent. Ik kan je helpen met vragen over Arduino en Raspberry Pi onderdelen. Vraag me bijvoorbeeld:\n\n• Waar ligt de Raspberry Pi?\n• Hebben we LEDs op voorraad?\n• Arduino is kwijt',
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll naar laatste bericht
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Stuur bericht naar chatbot
    const sendMessage = async (e) => {
        e.preventDefault();
        
        if (!inputMessage.trim()) return;

        // Voeg user message toe
        const userMsg = {
            id: Date.now(),
            type: 'user',
            text: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: inputMessage,
                    userId: user?.id || null
                })
            });

            const data = await response.json();

            // Voeg bot response toe
            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: data.response || 'Sorry, er ging iets mis.',
                timestamp: new Date(),
                success: data.success
            };
            setMessages(prev => [...prev, botMsg]);

        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: '❌ Sorry, ik kan momenteel niet reageren. Probeer het later opnieuw.',
                timestamp: new Date(),
                success: false
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    // Quick action buttons
    const quickActions = [
        { text: 'Waar ligt...?', prompt: 'Waar ligt de ' },
        { text: 'Voorraad?', prompt: 'Hebben we ' },
        { text: 'Help!', prompt: 'Hoe werkt ' }
    ];

    const handleQuickAction = (prompt) => {
        setInputMessage(prompt);
    };

    return (
        <>
            {/* Floating chat button */}
            <button 
                className={`chat-fab ${isChatOpen ? 'open' : ''}`}
                onClick={() => setIsChatOpen(!isChatOpen)}
                aria-label="Open chatbot"
            >
                {isChatOpen ? '✕' : '💬'}
            </button>

            {/* Chat window */}
            {isChatOpen && (
                <div className="chat-window">
                    <div className="chat-header">
                        <div className="chat-header-title">
                            <span className="chat-icon">🤖</span>
                            <div>
                                <h3>Chatbot Assistent</h3>
                                <span className="chat-status">● Online</span>
                            </div>
                        </div>
                        <button 
                            className="chat-close"
                            onClick={() => setIsChatOpen(false)}
                            aria-label="Sluit chat"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="chat-messages">
                        {messages.map(msg => (
                            <div 
                                key={msg.id} 
                                className={`chat-message ${msg.type}`}
                            >
                                <div className="message-content">
                                    <div className="message-text">
                                        {msg.text.split('\n').map((line, i) => (
                                            <span key={i}>
                                                {line}
                                                {i < msg.text.split('\n').length - 1 && <br />}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="message-time">
                                        {msg.timestamp.toLocaleTimeString('nl-NL', { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="chat-message bot">
                                <div className="message-content">
                                    <div className="typing-indicator">
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick actions */}
                    <div className="chat-quick-actions">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                className="quick-action-btn"
                                onClick={() => handleQuickAction(action.prompt)}
                                disabled={isLoading}
                            >
                                {action.text}
                            </button>
                        ))}
                    </div>

                    <form className="chat-input-form" onSubmit={sendMessage}>
                        <input
                            type="text"
                            className="chat-input"
                            placeholder="Stel je vraag..."
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            disabled={isLoading}
                        />
                        <button 
                            type="submit" 
                            className="chat-send-btn"
                            disabled={isLoading || !inputMessage.trim()}
                            aria-label="Verstuur bericht"
                        >
                            {isLoading ? '⏳' : '➤'}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatBot;
