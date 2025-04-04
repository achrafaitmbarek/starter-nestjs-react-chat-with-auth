import { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Users } from "lucide-react";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { User } from "lucide-react";

interface User {
    id: string;
    email: string;
    lastConnected?: string | Date;
}

interface ConnectedUsersProps {
    onStartPrivateChat?: (userId: string) => void;
}

export default function ConnectedUsers({ onStartPrivateChat }: ConnectedUsersProps) {
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<User[]>([]);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    useEffect(() => {
        if (!socket || !isConnected || !user) return;

        socket.emit('identifyUser', {
            id: user.id,
            email: user.email
        });

        socket.emit('getConnectedUsers');

        socket.on('connectedUsers', (data: { online: User[], offline: User[] }) => {
            const filteredOnlineUsers = data.online.filter((u: User) => u.id !== user.id);
            const filteredOfflineUsers = data.offline.filter((u: User) => u.id !== user.id);
            setOnlineUsers(filteredOnlineUsers || []);
            setOfflineUsers(filteredOfflineUsers || []);
        });

        return () => {
            socket.off('connectedUsers');
        };
    }, [socket, isConnected, user]);

    const formatLastSeen = (lastConnected?: string | Date) => {
        if (!lastConnected) return "Unknown";
        try {
            const date = new Date(lastConnected);
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (error) {
            console.error("Error parsing date:", error);
            return "Invalid date";
        }
    };

    if (!isConnected) return null;

    return (
        <div className="space-y-4">
            {onlineUsers.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Online</h3>
                        <Badge variant="secondary">{onlineUsers.length}</Badge>
                    </div>
                    <Card>
                        <ul className="divide-y">
                            {onlineUsers.map(user => (
                                <li key={user.id} className="p-3 hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <Avatar className="h-8 w-8 bg-primary text-primary-foreground">
                                                    <AvatarFallback className="text-indigo-950 text-xl font-extrabold">{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-1 ring-white"></span>
                                            </div>
                                            <span className="text-sm">{user.email}</span>
                                        </div>
                                        {onStartPrivateChat && (
                                            <Button
                                                onClick={() => onStartPrivateChat(user.id)}
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <MessageSquare size={16} />
                                                <span className="sr-only">Message</span>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {offlineUsers.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Offline</h3>
                        <Badge variant="outline">{offlineUsers.length}</Badge>
                    </div>
                    <Card>
                        <ul className="divide-y">
                            {offlineUsers.map(user => (
                                <li key={user.id} className="p-3 hover:bg-accent/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="relative">
                                                <Avatar className="h-8 w-8 bg-muted text-muted-foreground">
                                                    <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                                                </Avatar>
                                                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-gray-400 ring-1 ring-white"></span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm">{user.email}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatLastSeen(user.lastConnected)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>
            )}

            {onlineUsers.length === 0 && offlineUsers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users available</p>
                </div>
            )}
        </div>
    );
}