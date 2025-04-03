import React, { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { messageService, Message } from "../../services/messageService";
import { useSocket } from "../../contexts/SocketContext";
import { Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const MessageList: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const {
    data: messages,
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["messages"],
    queryFn: () => messageService.findAll(),
  });

  useEffect(() => {
    if (!socket) return;

    socket.on('newMessage', (message: Message) => {
      queryClient.setQueryData(['messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return [message];
        return [...oldData, message];
      });
    });

    socket.on('messageLiked', (data: { messageId: string, likes: number }) => {
      queryClient.setQueryData(['messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(msg =>
          msg.id === data.messageId ? { ...msg, likes: data.likes } : msg
        );
      });
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageLiked');
    };
  }, [socket, queryClient]);

  const handleLikeMessage = (messageId: string) => {
    if (socket) {
      socket.emit('likeMessage', { messageId });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return <div className="text-center">Loading messages...</div>;
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        Error loading messages. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages?.map((message) => (
        <div key={message.id} className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-gray-800">{message.text}</p>
          <div className="flex justify-between items-center text-sm mt-4">
            <div className="text-gray-500/60">
              <p>{message?.user?.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLikeMessage(message.id)}
                className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
              >
                <Heart
                  size={16}
                  className={message.likes && message.likes > 0 ? "fill-red-500 text-red-500" : ""}
                />
                <span>{message.likes || 0}</span>
              </button>
              <p className="text-gray-500/60">
                {(() => {
                  const date = new Date(message.createdAt);
                  return formatDistanceToNow(date, {
                    locale: fr,
                    addSuffix: true
                  });
                })()}
              </p>
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;