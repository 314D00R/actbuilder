"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ClipboardList } from "lucide-react";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Помилка входу. Перевірте дані.");
        return;
      }

      toast.success("Вхід успішний!");
      router.push("/general");
    } catch (err) {
      toast.error("Щось пішло не так під час з'єднання з сервером.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (password.length < 8) {
      toast.error("Пароль має містити мінімум 8 символів");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name: email.split("@")[0],
      });

      if (error) {
        toast.error(error.message || "Помилка реєстрації");
        return;
      }

      toast.success("Реєстрація успішна!");
      router.push("/general");
    } catch (err) {
      toast.error("Щось пішло не так під час реєстрації.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="text-primary" size={28} />
            <CardTitle className="text-2xl font-extrabold">ActBuilder</CardTitle>
          </div>
          <CardDescription className="uppercase tracking-wide font-medium text-xs">єВідновлення · Вхід</CardDescription>
        </CardHeader>

        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase text-muted-foreground">
                Пароль
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </CardContent>

          <CardFooter className="flex gap-3">
            <Button type="submit" className="flex-1 font-bold" disabled={isLoading}>
              Увійти
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 font-bold"
              onClick={handleRegister}
              disabled={isLoading}
            >
              Реєстрація
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
