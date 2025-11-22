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
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const { t } = useLanguage();

  const [email, setEmail] = useState('priya@example.com');
  const [password, setPassword] = useState('password');

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    initiateEmailSignIn(auth, email, password);
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
      <Card className="w-full max-w-md shadow-2xl">
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
                type="email"
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
            <Button type="submit" className="w-full font-headline">
              {t("login_button")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
