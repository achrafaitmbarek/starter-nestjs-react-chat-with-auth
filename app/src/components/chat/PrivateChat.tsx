import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { PrivateMessage } from "../../services/messageService";
import { User } from "@/services/authService";
import { SendHorizontal, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface PrivateChatProps {
    partnerId: string;
    onClose: () => void;
}

interface MessageFormData {
    text: string;
}

const PrivateChat: React.FC<PrivateChatProps> = ({ partnerId, onClose }) => {
    const [messages, setMessages] = useState<PrivateMessage[]>([]);
    const [partner, setPartner] = useState<User | null>(null);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { register, handleSubmit, reset, watch } = useForm<MessageFormData>();
    const messageText = watch("text", "");

    useEffect(() => {
        if (!socket || !isConnected || !user || !partnerId) return;

        socket.emit('markMessagesAsRead', { partnerId });

        socket.emit('getPrivateMessages', { partnerId }, (response: { success: boolean, messages: PrivateMessage[] }) => {
            if (response.success) {
                setMessages(response.messages);

                if (response.messages.length > 0) {
                    const firstMessage = response.messages[0];
                    const partnerInfo = firstMessage.sender.id === user.id ? firstMessage.recipient : firstMessage.sender;
                    setPartner(partnerInfo);
                }
            }
        });

        const handlePrivateMessage = (message: PrivateMessage) => {
            if ((message.sender.id === user.id && message.recipient.id === partnerId) ||
                (message.sender.id === partnerId && message.recipient.id === user.id)) {
                setMessages(prev => [...prev, message]);

                if (message.sender.id === partnerId) {
                    socket.emit('markMessagesAsRead', { partnerId });
                }
            }
        };

        socket.on('privateMessage', handlePrivateMessage);

        return () => {
            socket.off('privateMessage', handlePrivateMessage);
        };
    }, [socket, isConnected, user, partnerId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const onSubmit = (data: MessageFormData) => {
        if (!socket || !isConnected || !user || !partnerId || !data.text.trim()) return;

        socket.emit('sendPrivateMessage', {
            text: data.text.trim(),
            recipientId: partnerId
        });

        reset();
    };

    const formatMessageTime = (date: Date | string) => {
        if (!date) return '';
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        const adjustedDate = new Date(parsedDate.getTime() + 2 * 60 * 60 * 1000);
        return formatDistanceToNow(adjustedDate, {
            locale: fr,
            addSuffix: true,
        });
    };

    return (
        <div className="fixed bottom-4 right-4 w-80 h-96 bg-card rounded-lg shadow-lg flex flex-col overflow-hidden z-50">
            <div className="px-4 py-3 bg-primary text-primary-foreground flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                            {partner?.email?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-medium truncate">{partner?.email || 'Chat'}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-primary-foreground h-8 w-8">
                    <X size={16} />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map(message => {
                    const isFromMe = message.sender.id === user?.id;

                    return (
                        <div
                            key={message.id}
                            className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[70%] rounded-lg px-3 py-2 ${isFromMe
                                    ? 'bg-primary/90 text-primary-foreground'
                                    : 'bg-muted text-foreground'
                                    }`}
                            >
                                <p className="text-sm break-words">{message.text}</p>
                                <p className={`text-xs mt-1 ${isFromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {formatMessageTime(message.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-2 border-t">
                <div className="flex gap-2">
                    <Input
                        {...register("text", { required: true })}
                        placeholder="Type a message..."
                        className="h-9 text-sm"
                    />
                    <Button
                        type="submit"
                        disabled={!messageText.trim()}
                        size="icon"
                        className="h-9 w-9"
                    >
                        <SendHorizontal size={16} />
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default PrivateChat;