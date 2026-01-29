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
import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const formSchema = z
  .object({
    password: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła muszą być takie same",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof formSchema>;

export function ConfirmResetForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [isSuccess, setIsSuccess] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error("Brak tokenu resetowania hasła.");
      form.setError("root", {
        message: "Brak tokenu resetowania hasła.",
      });
      return;
    }

    try {
      const { error } = await authClient.resetPassword({
        newPassword: data.password,
        token,
      });

      if (error) {
        if (
          error.message?.includes("expired") ||
          error.message?.includes("invalid")
        ) {
          toast.error("Link wygasł. Wyślij nowy link resetowania hasła.");
          form.setError("root", {
            message: "Link resetowania hasła wygasł lub jest nieprawidłowy.",
          });
        } else {
          toast.error("Wystąpił błąd. Spróbuj ponownie później.");
          form.setError("root", {
            message: "Wystąpił błąd. Spróbuj ponownie później.",
          });
        }
        return;
      }

      toast.success("Hasło zmienione. Możesz się teraz zalogować.");
      setIsSuccess(true);
      setTimeout(() => {
        router.push("/auth/sign-in");
      }, 3000);
    } catch {
      toast.error("Wystąpił nieoczekiwany błąd.");
      form.setError("root", {
        message: "Wystąpił nieoczekiwany błąd.",
      });
    }
  };

  if (!token) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Nieprawidłowy link
          </h1>
          <p className="text-balance text-sm text-muted-foreground">
            Link resetowania hasła jest nieprawidłowy lub wygasł.
          </p>
        </div>
        <Button asChild className="w-full font-medium">
          <Link href="/auth/reset-password">Poproś o nowy link</Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Hasło zmienione</h1>
          <p className="text-balance text-sm text-muted-foreground">
            Twoje hasło zostało pomyślnie zmienione. Za chwilę zostaniesz
            przekierowany do strony logowania.
          </p>
        </div>
        <Button asChild className="w-full font-medium">
          <Link href="/auth/sign-in">Zaloguj się</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Ustaw nowe hasło</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Wpisz swoje nowe hasło poniżej.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nowe hasło</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      placeholder="Minimum 8 znaków"
                      className="pl-10"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Potwierdź hasło</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      type="password"
                      placeholder="Powtórz hasło"
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
            {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz nowe hasło"}
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
