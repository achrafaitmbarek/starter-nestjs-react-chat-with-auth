import React, { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Conversation } from "../../services/messageService";

const ConversationList: React.FC<{
    onSelectConversation: (userId: string) => void;
    selectedConversation?: string;
}> = ({ onSelectConversation, selectedConversation }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        socket.emit('getConversations', (response: { success: boolean, conversations: Conversation[] }) => {
            if (response.success) {
                setConversations(response.conversations);
            }
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.on('privateMessage', (message: any) => {
            setConversations(prevConversations => {
                const partnerId = message.sender.id === user.id ? message.recipient.id : message.sender.id;
                const conversationIndex = prevConversations.findIndex(c => c.partner.id === partnerId);

                if (conversationIndex >= 0) {
                    const newConversations = [...prevConversations];
                    const conversation = newConversations[conversationIndex];
                    newConversations[conversationIndex] = {
                        ...conversation,
                        lastMessage: message,
                        unread: message.sender.id !== user.id ? conversation.unread + 1 : conversation.unread
                    };

                    const updatedConvo = newConversations[conversationIndex];
                    newConversations.splice(conversationIndex, 1);
                    return [updatedConvo, ...newConversations];
                } else {
                    const partner = message.sender.id === user.id ? message.recipient : message.sender;
                    return [{
                        partner,
                        lastMessage: message,
                        unread: message.sender.id !== user.id ? 1 : 0
                    }, ...prevConversations];
                }
            });
        });

        socket.on('messagesRead', (data: { by: string, conversation: string }) => {
            setConversations(prevConversations => {
                return prevConversations.map(convo => {
                    if (convo.partner.id === data.by) {
                        return { ...convo, unread: 0 };
                    }
                    return convo;
                });
            });
        });

        return () => {
            socket.off('privateMessage');
            socket.off('messagesRead');
        };
    }, [socket, isConnected, user]);

    const formatLastMessageTime = (date: Date | string) => {
        if (!date) return '';
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        const adjustedDate = new Date(parsedDate.getTime() + 2 * 60 * 60 * 1000);
        return formatDistanceToNow(adjustedDate, {
            locale: fr,
            addSuffix: true,
        });
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm"
            >
                <span>Conversations</span>
                {conversations.reduce((count, convo) => count + convo.unread, 0) > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conversations.reduce((count, convo) => count + convo.unread, 0)}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">Conversations</h3>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {conversations.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500 italic">No conversations yet</p>
                        ) : (
                            <ul className="py-2">
                                {conversations.map(conversation => (
                                    <li
                                        key={conversation.partner.id}
                                        className={`px-4 py-2 hover:bg-gray-50 cursor-pointer ${selectedConversation === conversation.partner.id ? 'bg-blue-50' : ''
                                            }`}
                                        onClick={() => onSelectConversation(conversation.partner.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white">
                                                    {conversation.partner.email.charAt(0).toUpperCase()}
                                                </div>
                                                {conversation.unread > 0 && (
                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                        {conversation.unread}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-medium truncate">{conversation.partner.email}</span>
                                                    <span className="text-xs text-gray-500">{formatLastMessageTime(conversation.lastMessage.createdAt)}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {conversation.lastMessage.sender.id === user?.id ? 'You: ' : ''}
                                                    {conversation.lastMessage.text}
                                                </p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ConversationList;