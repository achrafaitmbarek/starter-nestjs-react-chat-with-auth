import { useAuth } from "@/contexts/AuthContext";
import MessageForm from "../components/chat/MessageForm";
import MessageList from "../components/chat/MessageList";
import UserInfo from "../components/chat/UserInfo";
import LogoutButton from "../components/LogoutButton";
import ConnectedUsers from "../components/chat/ConnectedUsers";

const Chat = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto w-full h-screen">
      <div className="rounded-lg w-full h-full">
        <div className="h-5/6 relative">
          <div className="absolute top-A left-32 z-10">
            <ConnectedUsers />
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
    </div>
  );
};

export default Chat;