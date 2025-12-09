'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Compass } from 'lucide-react';
import { useAuth } from '@/firebase';
import { initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const { t } = useLanguage();
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRateLimited, setIsRateLimited] = useState(false);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRateLimited(false); // Reset rate limit banner
    try {
      await initiateEmailSignIn(auth, email, password);
    } catch (error: any) {
      console.error("Login error:", error);

      if (error.code === 'auth/too-many-requests') {
        // Show rate limit banner
        setIsRateLimited(true);
        toast({
          variant: "destructive",
          title: "Account Temporarily Locked",
          description: "Too many failed login attempts. Please wait 15 minutes before trying again.",
        });
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "Invalid username or password. Please try again.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: "An error occurred. Please try again later.",
        });
      }
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Rate Limit Warning Banner */}
        {isRateLimited && (
          <Alert variant="destructive" className="shadow-lg">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Account Temporarily Locked</AlertTitle>
            <AlertDescription className="mt-2">
              Too many failed login attempts detected. Your account is temporarily locked for security.
              <br />
              <strong className="block mt-2">Please wait 15 minutes before trying again.</strong>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsRateLimited(false)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Card className="w-full shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
              <Compass className="w-12 h-12 text-primary" />
            </div>
            <CardTitle className="font-headline text-3xl">
              {t("app_name")}
            </CardTitle>
            <CardDescription>
              {t("login_subtitle")}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email" className="font-headline">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder={t("email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-headline">
                  {t("password")}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="w-full font-headline"
                disabled={isRateLimited}
              >
                {t("login_button")}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
