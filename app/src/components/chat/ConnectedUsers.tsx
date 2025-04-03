import { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface User {
    id: string;
    email: string;
    lastConnected?: string | Date;
}

export default function ConnectedUsers() {
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
    const [offlineUsers, setOfflineUsers] = useState<User[]>([]);
    const [isOpen, setIsOpen] = useState(false);
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
            setOnlineUsers(data.online || []);
            setOfflineUsers(data.offline || []);
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
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/90 rounded-lg shadow-sm hover:bg-white transition-colors"
            >
                <Users size={18} className="text-blue-500" />
                <span className="font-medium text-sm">Users</span>
                <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full bg-blue-500 text-white">
                    {onlineUsers.length}
                </span>
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">Online ({onlineUsers.length})</h3>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {onlineUsers.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500 italic">No users online</p>
                        ) : (
                            <ul className="py-2">
                                {onlineUsers.map(user => (
                                    <li key={user.id} className="px-4 py-2 hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center text-white">
                                                    {user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white"></div>
                                            </div>
                                            <span className="text-sm truncate">{user.email}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="px-4 py-3 border-b border-t border-gray-100">
                        <h3 className="text-sm font-medium text-gray-700">Offline ({offlineUsers.length})</h3>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                        {offlineUsers.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-gray-500 italic">No offline users</p>
                        ) : (
                            <ul className="py-2">
                                {offlineUsers.map(user => (
                                    <li key={user.id} className="px-4 py-2 hover:bg-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-300 to-gray-400 flex items-center justify-center text-white">
                                                    {user.email.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-gray-500 border-2 border-white"></div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm truncate text-gray-700">{user.email}</span>
                                                <span className="text-xs text-gray-500">
                                                    {formatLastSeen(user.lastConnected)}
                                                </span>
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
}