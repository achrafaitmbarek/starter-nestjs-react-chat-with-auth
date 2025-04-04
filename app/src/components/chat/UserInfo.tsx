import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useSocket } from "../../contexts/SocketContext";
import { Button } from "../ui/button";
import { LogIn } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";

const UserInfo: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Button
        onClick={() => navigate("/signin")}
        className="w-full"
      >
        <LogIn className="mr-2 h-4 w-4" />
        <span>Se connecter</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user.email[0].toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {isConnected ? (
          <Badge
            variant="default"
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full p-0 border-2 border-background bg-green-500"
          />
        ) : (
          <Badge
            variant="outline"
            className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full p-0 border-2 border-background bg-yellow-500"
          />
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-foreground">{user.email}</span>
        <span className="text-xs text-muted-foreground">
          {isConnected ? 'En ligne' : 'Connexion...'}
        </span>
      </div>
    </div>
  );
};

export default UserInfo;