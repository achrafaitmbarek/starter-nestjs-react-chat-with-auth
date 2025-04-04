import React, { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { messageService, Message } from "../../services/messageService";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { Heart, MessageSquare, Loader2 } from 'lucide-react';
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { User } from "@/services/authService";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

const MessageList: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
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

    socket.on('messageLiked', (data: { messageId: string; likes: number; likedBy: User[] }) => {
      queryClient.setQueryData(['messages'], (oldData: Message[] | undefined) => {
        if (!oldData) return [];
        return oldData.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, likes: data.likes, likedBy: data.likedBy }
            : msg
        );
      });
    });

    return () => {
      socket.off('newMessage');
      socket.off('messageLiked');
    };
  }, [socket, queryClient]);

  const hasUserLikedMessage = (message: Message) => {
    if (!user || !message.likedBy) return false;
    return message.likedBy.some(likedUser => likedUser.id === user.id);
  };

  const handleToggleLike = (messageId: string) => {
    if (socket && user) {
      const message = messages?.find(msg => msg.id === messageId);
      if (message) {
        if (hasUserLikedMessage(message)) {
          socket.emit('unlikeMessage', { messageId });
        } else {
          socket.emit('likeMessage', { messageId });
        }
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageDate = (date: string | Date) => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    const adjustedDate = new Date(parsedDate.getTime() + 2 * 60 * 60 * 1000);
    return formatDistanceToNow(adjustedDate, {
      locale: fr,
      addSuffix: true,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <p className="font-medium">Error loading messages</p>
          <p className="text-sm mt-1">Please try again later</p>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="flex flex-col items-center gap-3">
          <MessageSquare className="h-12 w-12 opacity-20" />
          <div>
            <h3 className="font-medium">No messages yet</h3>
            <p className="text-sm text-muted-foreground">Start the conversation!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {messages.map((message) => {
        const userHasLiked = hasUserLikedMessage(message);

        return (
          <Card key={message.id} className="shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {message.user?.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">{message.user?.email}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatMessageDate(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1">{message.text}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pb-3 pt-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleLike(message.id)}
                className={`space-x-1 h-8 ${userHasLiked ? "text-rose-500" : ""}`}
              >
                <Heart
                  size={16}
                  className={userHasLiked ? "fill-rose-500" : ""}
                />
                <span>{message.likes || 0}</span>
              </Button>
            </CardFooter>
          </Card>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;