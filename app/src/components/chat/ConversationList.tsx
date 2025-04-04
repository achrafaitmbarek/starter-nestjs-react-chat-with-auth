import React, { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Conversation } from "../../services/messageService";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { MessageCircle } from "lucide-react";

const ConversationList: React.FC<{
    onSelectConversation: (userId: string) => void;
    selectedConversation?: string;
}> = ({ onSelectConversation, selectedConversation }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

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

    const totalUnread = conversations.reduce((count, convo) => count + convo.unread, 0);

    if (conversations.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {totalUnread > 0 && (
                <div className="flex justify-end">
                    <Badge variant="destructive">{totalUnread} unread</Badge>
                </div>
            )}

            <ul className="space-y-2">
                {conversations.map(conversation => (
                    <li
                        key={conversation.partner.id}
                        className={`rounded-md cursor-pointer ${selectedConversation === conversation.partner.id
                                ? 'bg-accent'
                                : 'hover:bg-accent/50'
                            }`}
                        onClick={() => onSelectConversation(conversation.partner.id)}
                    >
                        <div className="p-3 flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="h-10 w-10">
                                    <AvatarFallback className="bg-primary text-primary-foreground">
                                        {conversation.partner.email.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {conversation.unread > 0 && (
                                    <Badge
                                        variant="destructive"
                                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0"
                                    >
                                        {conversation.unread}
                                    </Badge>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium truncate">
                                        {conversation.partner.email}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatLastMessageTime(conversation.lastMessage.createdAt)}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    {conversation.lastMessage.sender.id === user?.id ? 'You: ' : ''}
                                    {conversation.lastMessage.text}
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ConversationList;