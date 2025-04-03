import { useAuth } from "@/contexts/AuthContext";
import MessageForm from "../components/chat/MessageForm";
import MessageList from "../components/chat/MessageList";
import UserInfo from "../components/chat/UserInfo";
import LogoutButton from "../components/LogoutButton";
import ConnectedUsers from "../components/chat/ConnectedUsers";
import ConversationList from "@/components/chat/ConversationList";
import { useState } from "react";
import PrivateChat from "@/components/chat/PrivateChat";

const Chat = () => {
  const { user } = useAuth();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const handleStartChat = (userId: string) => {
    setActiveConversation(userId);
  };

  const handleCloseChat = () => {
    setActiveConversation(null);
  };

  return (
    <div className="container mx-auto w-full h-screen">
      <div className="rounded-lg w-full h-full">
        <div className="h-5/6 relative">
          <div className="absolute top-8 left-32 z-10 space-y-2">
            <ConnectedUsers onStartPrivateChat={handleStartChat} />
            <ConversationList
              onSelectConversation={handleStartChat}
              selectedConversation={activeConversation || undefined}
            />
          </div>

          <div className="backdrop-blur-sm bg-white/50 h-1/6 absolute top-0 right-3 w-full"></div>
          <div className="overflow-y-scroll h-full">
            <MessageList />
          </div>
        </div>
        <div className="h-1/6 flex justify-center items-center">
          <div className="w-full gap-4 flex flex-col ">
            {user && (
              <div className="">
                <MessageForm />
              </div>
            )}
            <div className="flex justify-between">
              <UserInfo />
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
      {activeConversation && (
        <PrivateChat
          partnerId={activeConversation}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
};

export default Chat;