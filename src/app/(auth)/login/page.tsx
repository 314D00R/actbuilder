"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ClipboardList, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (type: "signin" | "signup") => {
    setIsLoading(true);
    try {
      const { error } =
        type === "signin"
          ? await authClient.signIn.email({ email, password })
          : await authClient.signUp.email({ email, password, name: email.split("@")[0] });

      if (error) {
        toast.error(error.message || "Помилка автентифікації");
      } else {
        toast.success(type === "signin" ? "Вхід успішний" : "Реєстрація успішна");
        router.push("/general");
      }
    } catch (e) {
      toast.error("Помилка з'єднання");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background p-4">
      <Card className="w-full max-w-[400px] border-border bg-card/50 backdrop-blur-sm shadow-2xl">
        <CardHeader className="space-y-1 pb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary rounded-lg">
              <ClipboardList className="text-primary-foreground" size={24} />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">ActBuilder</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-widest font-semibold">
            Система єВідновлення · Авторизація
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="bg-background/50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="bg-background/50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button className="w-full font-bold h-11" onClick={() => handleAuth("signin")} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Увійти
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground"
            onClick={() => handleAuth("signup")}
            disabled={isLoading}
          >
            Створити акаунт
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
