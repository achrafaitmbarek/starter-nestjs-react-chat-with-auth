import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { AuthFormData } from "../services/authService";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface AuthFormProps {
  title: string;
  submitButtonText: string;
  onSubmit: (data: AuthFormData) => Promise<void>;
  redirectText: string;
  redirectLinkText: string;
  redirectTo: string;
}

const AuthForm: React.FC<AuthFormProps> = ({
  title,
  submitButtonText,
  onSubmit,
  redirectText,
  redirectLinkText,
  redirectTo,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>();

  const handleFormSubmit = async (data: AuthFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      await onSubmit(data);
    } catch (err) {
      console.error("Authentication error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'authentification"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Card className="w-full max-w-md shadow-lg relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4"
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span className="sr-only">Toggle theme</span>
        </Button>

        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Entrez vos informations pour continuer
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Adresse email</Label>
              <Input
                id="email"
                autoComplete="email"
                type="email"
                placeholder="nom@example.com"
                {...register("email", {
                  required: "L'email est requis",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Adresse email invalide",
                  },
                })}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete={
                  redirectTo === "/signin" ? "new-password" : "current-password"
                }
                {...register("password", {
                  required: "Le mot de passe est requis",
                  minLength: {
                    value: 6,
                    message:
                      "Le mot de passe doit contenir au moins 6 caractères",
                  },
                })}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                submitButtonText
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {redirectText}{" "}
            <Link
              to={redirectTo}
              className="font-medium text-primary hover:underline"
            >
              {redirectLinkText}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthForm;