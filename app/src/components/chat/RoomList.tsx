import React, { useEffect, useState } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { Room } from "../../services/messageService";
import { parseISO, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageSquarePlus, Users, Plus } from "lucide-react";
import { Button } from "../ui/button";

import { Avatar, AvatarFallback } from "../ui/avatar";


interface RoomListProps {
    onSelectRoom: (roomId: string) => void;
    selectedRoom?: string;
    onCreateRoom: () => void;
}

const RoomList: React.FC<RoomListProps> = ({
    onSelectRoom,
    selectedRoom,
    onCreateRoom
}) => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const { socket, isConnected } = useSocket();
    const { user } = useAuth();

    useEffect(() => {
        if (!socket || !isConnected) return;

        socket.emit('getAllRooms', (response: { success: boolean, rooms: Room[] }) => {
            if (response.success) {
                setRooms(response.rooms);
            }
        });

        socket.on('roomList', (updatedRooms: Room[]) => {
            setRooms(updatedRooms);
        });

        socket.on('roomUpdated', (updatedRoom: Room) => {
            setRooms(prevRooms =>
                prevRooms.map(room =>
                    room.id === updatedRoom.id ? updatedRoom : room
                )
            );
        });

        return () => {
            socket.off('roomList');
            socket.off('roomUpdated');
        };
    }, [socket, isConnected]);

    const formatCreatedAt = (date: Date | string) => {
        if (!date) return '';
        const parsedDate = typeof date === 'string' ? parseISO(date) : date;
        const adjustedDate = new Date(parsedDate.getTime() + 2 * 60 * 60 * 1000);
        return formatDistanceToNow(adjustedDate, {
            locale: fr,
            addSuffix: true,
        });
    };

    const isUserInRoom = (room: Room) => {
        if (!user) return false;
        return room.members.some(member => member.id === user.id);
    };

    if (!isConnected) return null;

    if (rooms.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground">
                <MessageSquarePlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No rooms available</p>
                <Button
                    onClick={onCreateRoom}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                >
                    <Plus size={16} className="mr-1" />
                    Create Room
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {rooms.map(room => {
                const userIsMember = isUserInRoom(room);

                return (
                    <div
                        key={room.id}
                        className={`rounded-md border p-3 cursor-pointer transition-colors ${selectedRoom === room.id
                                ? 'bg-accent border-primary/20'
                                : 'hover:bg-accent/50'
                            }`}
                        onClick={() => onSelectRoom(room.id)}
                    >
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/20 text-primary">
                                    {room.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between">
                                    <span className="font-medium truncate">{room.name}</span>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatCreatedAt(room.createdAt)}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                    {room.description || `Created by ${room.owner.email}`}
                                </p>

                                <div className="flex items-center mt-2 justify-between">
                                    <div className="flex items-center gap-1">
                                        <Users size={14} className="text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">
                                            {room.members.length} {room.members.length === 1 ? 'member' : 'members'}
                                        </span>
                                    </div>

                                    {!userIsMember && (
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                socket?.emit('joinRoom', { roomId: room.id });
                                            }}
                                            variant="secondary"
                                            size="sm"
                                            className="h-7 text-xs"
                                        >
                                            Join Room
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default RoomList;