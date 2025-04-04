import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { Room, RoomMessage } from "../../services/messageService";
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SendHorizontal, X, Users, LogOut } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

interface RoomChatProps {
    roomId: string;
    onClose: () => void;
}

interface MessageFormData {
    text: string;
}

const RoomChat: React.FC<RoomChatProps> = ({ roomId, onClose }) => {
    const [messages, setMessages] = useState<RoomMessage[]>([]);
    const [room, setRoom] = useState<Room | null>(null);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { register, handleSubmit, reset, watch } = useForm<MessageFormData>();
    const messageText = watch("text", "");
    const [showMembers, setShowMembers] = useState(false);

    useEffect(() => {
        if (!socket || !isConnected || !roomId) return;

        socket.emit('joinRoom', { roomId });

        socket.emit('getAllRooms', (response: { success: boolean, rooms: Room[] }) => {
            if (response.success) {
                const foundRoom = response.rooms.find(r => r.id === roomId);
                if (foundRoom) {
                    setRoom(foundRoom);
                }
            }
        });

        socket.emit('getRoomMessages', { roomId }, (response: { success: boolean, messages: RoomMessage[] }) => {
            if (response.success) {
                setMessages(response.messages);
            }
        });

        const handleRoomMessage = (message: RoomMessage) => {
            if (message.room.id === roomId) {
                setMessages(prev => [...prev, message]);
            }
        };

        const handleRoomUpdate = (updatedRoom: Room) => {
            if (updatedRoom.id === roomId) {
                setRoom(updatedRoom);
            }
        };

        const handleUserJoined = (data: { roomId: string, user: { id: string, email: string } }) => {
            if (data.roomId === roomId) {
                if (data.user.id === user?.id) {
                    toast.success(`Welcome to the room`, {
                        position: "top-right",
                        duration: 3000,
                    });
                } else {
                    toast.success(`${data.user.email} joined the room`, {
                        position: "top-right",
                        duration: 3000,
                    });
                }
            }
        };

        const handleUserLeft = (data: { roomId: string, userId: string, userEmail: string }) => {
            if (data.roomId === roomId) {
                if (data.userId === user?.id) {
                    toast.info(`You left the room`, {
                        position: "top-right",
                        duration: 3000,
                    });
                } else {
                    toast.info(`${data.userEmail} left the room`, {
                        position: "top-right",
                        duration: 3000,
                    });
                }
            }
        };

        socket.on('roomMessage', handleRoomMessage);
        socket.on('roomUpdated', handleRoomUpdate);
        socket.on('userJoinedRoom', handleUserJoined);
        socket.on('userLeftRoom', handleUserLeft);

        return () => {
            socket.off('roomMessage', handleRoomMessage);
            socket.off('roomUpdated', handleRoomUpdate);
            socket.off('userJoinedRoom', handleUserJoined);
            socket.off('userLeftRoom', handleUserLeft);
        };
    }, [socket, isConnected, roomId, user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const onSubmit = (data: MessageFormData) => {
        if (!socket || !isConnected || !roomId || !data.text.trim()) return;

        socket.emit('sendRoomMessage', {
            text: data.text.trim(),
            roomId
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

    const handleLeaveRoom = () => {
        if (socket && isConnected && roomId) {
            socket.emit('leaveRoom', { roomId });
            toast.info(`You left ${room?.name || 'the room'}`, {
                position: "top-right",
                duration: 3000,
            });
            onClose();
        }
    };

    return (
        <div className="fixed bottom-4 right-4 w-96 h-[60vh] bg-card rounded-lg shadow-lg flex flex-col overflow-hidden z-50 border border-border">
            <div className="px-4 py-3 bg-primary text-primary-foreground flex justify-between items-center">
                <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground">
                            {room?.name?.charAt(0).toUpperCase() || "?"}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{room?.name || 'Room'}</h3>
                        <p className="text-xs text-primary-foreground/70 truncate">
                            {room?.members.length || 0} {(room?.members.length === 1) ? 'member' : 'members'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => setShowMembers(!showMembers)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-primary-foreground h-8 w-8 hover:bg-primary-foreground/10"
                                >
                                    <Users size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                {showMembers ? 'Hide members' : 'Show members'}
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={handleLeaveRoom}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <LogOut size={16} className="mr-1" />
                                    <span className="text-xs">Leave</span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Leave this room</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={onClose}
                                    variant="ghost"
                                    size="icon"
                                    className="text-primary-foreground h-8 w-8 hover:bg-primary-foreground/10"
                                >
                                    <X size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Close</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map(message => {
                        const isFromMe = message.sender.id === user?.id;

                        return (
                            <div
                                key={message.id}
                                className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-3 py-2 ${isFromMe
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground'
                                        }`}
                                >
                                    {!isFromMe && (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Avatar className="h-5 w-5">
                                                <AvatarFallback className="text-[10px]">
                                                    {message.sender.email?.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <p className="text-xs font-medium">
                                                {message.sender.email}
                                            </p>
                                        </div>
                                    )}
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

                {showMembers && (
                    <div className="w-48 border-l border-border overflow-y-auto bg-card">
                        <div className="p-3 border-b border-border">
                            <h4 className="font-medium text-sm">Members</h4>
                        </div>
                        <ul className="py-2">
                            {room?.members.map(member => (
                                <li key={member.id} className="px-3 py-1.5 hover:bg-accent">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-xs">
                                                {member.email?.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-xs truncate flex-1" title={member.email}>
                                            {member.email}
                                        </span>
                                        {room.owner.id === member.id && (
                                            <Badge variant="outline" className="h-4 text-[9px]">
                                                Owner
                                            </Badge>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-3 border-t border-border">
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

export default RoomChat;