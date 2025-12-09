'use client';

import { useState } from 'react';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { reauthenticateWithCredential, updatePassword, updateEmail, EmailAuthProvider } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { updatePasswordChangedTimestamp } from '@/firebase/auth/user-document';

export default function ChangeCredentialsPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newUsername, setNewUsername] = useState('');

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;

        if (newPassword && newPassword !== confirmPassword) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "New passwords do not match",
            });
            return;
        }

        setIsLoading(true);
        try {
            // 1. Re-authenticate
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Update Password if provided
            if (newPassword) {
                // Update Firebase Auth password
                await updatePassword(user, newPassword);

                // Update passwordChangedAt timestamp to invalidate all other sessions
                try {
                    await updatePasswordChangedTimestamp(firestore, user.uid);
                    toast({
                        title: "Success",
                        description: "Password updated successfully. All other devices will be logged out.",
                    });
                } catch (firestoreError: any) {
                    // Password was updated in Auth, but Firestore timestamp update failed
                    console.error("Firestore update failed:", firestoreError);
                    toast({
                        title: "Password Updated",
                        description: "Password changed, but session sync failed. Other devices may stay logged in temporarily.",
                        variant: "default",
                    });
                }
            }

            // 3. Update Email if provided
            if (newUsername) {
                if (newUsername !== user.email) {
                    await updateEmail(user, newUsername);
                    toast({
                        title: "Success",
                        description: "Email updated successfully",
                    });
                }
            }

            // Reset form
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setNewUsername('');

        } catch (error: any) {
            // These are Auth errors (re-authentication, password update, email update)
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Incorrect current password",
                });
            } else if (error.code === 'auth/operation-not-allowed') {
                toast({
                    variant: "destructive",
                    title: "Update Restricted",
                    description: "Server configuration prevents email updates without verification. Please check Firebase Console settings.",
                });
            } else if (error.code === 'auth/too-many-requests') {
                toast({
                    variant: "destructive",
                    title: "Too Many Attempts",
                    description: "Account temporarily locked due to multiple failed attempts. Please try again later.",
                });
            } else {
                console.error("Update failed:", error);
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: "Failed to update credentials: " + error.message,
                });
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Change Credentials</CardTitle>
                    <CardDescription>
                        Update your password or username. You must enter your current password to make changes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpdate} className="space-y-4">

                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password (Required)</Label>
                            <Input
                                id="current-password"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-username">New Email (Optional)</Label>
                            <Input
                                id="new-username"
                                type="text"
                                placeholder="Leave blank to keep current"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Current: {user?.email?.endsWith('@tracker.org') ? user.email.split('@')[0] : user?.email}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password (Optional)</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Leave blank to keep current"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Update Credentials
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
