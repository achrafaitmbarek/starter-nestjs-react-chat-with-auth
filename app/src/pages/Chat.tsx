import { useAuth } from "@/contexts/AuthContext";
import MessageForm from "../components/chat/MessageForm";
import MessageList from "../components/chat/MessageList";
import UserInfo from "../components/chat/UserInfo";
import LogoutButton from "../components/LogoutButton";
import ConnectedUsers from "../components/chat/ConnectedUsers";
import ConversationList from "@/components/chat/ConversationList";
import { useState } from "react";
import PrivateChat from "@/components/chat/PrivateChat";
import RoomList from "@/components/chat/RoomList";
import RoomChat from "@/components/chat/RoomChat";
import CreateRoomModal from "@/components/chat/CreateRoomModal";
import { UsersRound, MessageCircle, MessageSquarePlus, Menu, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const Chat = () => {
  const { user } = useAuth();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [activeSidebar, setActiveSidebar] = useState<'users' | 'conversations' | 'rooms'>('users');
  const [showSidebar, setShowSidebar] = useState(true);
  const { theme, toggleTheme } = useTheme();

  const handleStartChat = (userId: string) => {
    setActiveConversation(userId);
    setActiveRoom(null);
  };

  const handleCloseChat = () => {
    setActiveConversation(null);
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoom(roomId);
    setActiveConversation(null);
  };

  const handleCloseRoom = () => {
    setActiveRoom(null);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="w-16 flex flex-col items-center py-6 border-r bg-card">
        <div className="flex flex-col gap-1 items-center flex-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setActiveSidebar('users')}
                  variant={activeSidebar === 'users' ? "secondary" : "ghost"}
                  size="icon"
                  className="mb-1"
                >
                  <UsersRound size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Online Users</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setActiveSidebar('conversations')}
                  variant={activeSidebar === 'conversations' ? "secondary" : "ghost"}
                  size="icon"
                  className="mb-1"
                >
                  <MessageCircle size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Private Messages</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setActiveSidebar('rooms')}
                  variant={activeSidebar === 'rooms' ? "secondary" : "ghost"}
                  size="icon"
                  className="mb-1"
                >
                  <MessageSquarePlus size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Chat Rooms</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={toggleTheme}
                  variant="ghost"
                  size="icon"
                  className="mb-1"
                >
                  {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </TooltipContent>
            </Tooltip>

            <div className="mt-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowSidebar(!showSidebar)}
                    variant="ghost"
                    size="icon"
                  >
                    <Menu size={18} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>


      </div>

      {showSidebar && (
        <div className="w-96 border-r overflow-y-auto">
          <div className="p-4">
            <UserInfo />
          </div>

          <Separator className="my-2" />

          <div className="p-4 space-y-4">
            {activeSidebar === 'users' && (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Online Users</h2>
                </div>
                <Card className="p-3">
                  <ConnectedUsers onStartPrivateChat={handleStartChat} />
                </Card>
              </>
            )}

            {activeSidebar === 'conversations' && (
              <>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium">Conversations</h2>
                </div>
                <Card className="p-3">
                  <ConversationList
                    onSelectConversation={handleStartChat}
                    selectedConversation={activeConversation || undefined}
                  />
                </Card>
              </>
            )}

            {activeSidebar === 'rooms' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-medium">Chat Rooms</h2>
                </div>
                <Button
                  onClick={() => setShowCreateRoomModal(true)}
                  variant="outline"
                  className="w-full mb-2 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  <span>Create New Room</span>
                </Button>
                <Card className="p-3">
                  <RoomList
                    onSelectRoom={handleSelectRoom}
                    selectedRoom={activeRoom || undefined}
                    onCreateRoom={() => setShowCreateRoomModal(true)}
                  />
                </Card>
              </>
            )}
          </div>
          <div className="p-4 border-t mt-auto">
            <LogoutButton />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <Card className="flex-1 m-4 overflow-y-auto">
          <div className="p-4 h-full overflow-y-auto">
            <MessageList />
          </div>
        </Card>

        {user && (
          <div className="p-4 border-t">
            <MessageForm />
          </div>
        )}
      </div>

      <div className="fixed bottom-4 right-4 flex flex-col space-y-4 items-end">
        {activeConversation && (
          <PrivateChat
            partnerId={activeConversation}
            onClose={handleCloseChat}
          />
        )}

        {activeRoom && (
          <RoomChat
            roomId={activeRoom}
            onClose={handleCloseRoom}
          />
        )}
      </div>

      {showCreateRoomModal && (
        <CreateRoomModal
          onClose={() => setShowCreateRoomModal(false)}
        />
      )}
    </div>
  );
};

export default Chat;