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

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you'd handle Firebase authentication here
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <Compass className="w-12 h-12 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">
            Community Compass
          </CardTitle>
          <CardDescription>
            Welcome back! Please log in to your account.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="font-headline">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="priya@example.com"
                defaultValue="priya@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-headline">Password</Label>
              <Input id="password" type="password" defaultValue="password" required />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full font-headline">
              Log In
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
