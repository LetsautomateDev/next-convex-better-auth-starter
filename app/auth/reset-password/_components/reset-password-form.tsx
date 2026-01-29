"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Mail } from "lucide-react";

const formSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

type FormData = z.infer<typeof formSchema>;

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSuccess, setIsSuccess] = useState(false);
  const convex = useConvex();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Check if user is blocked
      const isBlocked = await convex.query(api.users.isUserBlockedByEmail, {
        email: data.email,
      });

      if (isBlocked) {
        form.setError("root", {
          message:
            "Konto zostało zablokowane. Skontaktuj się z administratorem.",
        });
        return;
      }

      const { error } = await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: "/auth/reset-password/confirm",
      });

      if (error) {
        form.setError("root", {
          message: "Wystąpił błąd. Spróbuj ponownie później.",
        });
        return;
      }

      setIsSuccess(true);
    } catch {
      form.setError("root", {
        message: "Wystąpił nieoczekiwany błąd.",
      });
    }
  };

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Sprawdź swoją skrzynkę
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            Wysłaliśmy link do resetowania hasła na podany adres email.
          </p>
        </div>
        <Button asChild className="w-full font-medium">
          <Link href="/auth/sign-in">Wróć do logowania</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Zresetuj hasło</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Wpisz swój email, aby otrzymać link do resetowania hasła.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="m@example.com"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root && (
            <p className="text-sm text-destructive text-center font-medium">
              {form.formState.errors.root.message}
            </p>
          )}
          <Button
            type="submit"
            className="w-full font-medium"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Wysyłanie..." : "Wyślij link"}
          </Button>
          <div className="text-center text-sm">
            <Link
              href="/auth/sign-in"
              className="font-medium text-primary hover:underline underline-offset-4"
            >
              Wróć do logowania
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
