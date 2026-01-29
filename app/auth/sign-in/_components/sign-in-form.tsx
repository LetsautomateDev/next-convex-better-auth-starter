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
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Mail, Lock } from "lucide-react";
import { toast } from "sonner";

const formSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
  password: z.string().min(1, "Hasło jest wymagane"),
});

type FormData = z.infer<typeof formSchema>;

export function SignInForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    });

    if (error) {
      const message = error.message || error.statusText;
      if (message?.includes("zablokowane") || error.status === 403) {
        form.setError("root", {
          message:
            "Konto zostało zablokowane. Skontaktuj się z administratorem.",
        });
      } else {
        form.setError("root", {
          message: "Nieprawidłowy email lub hasło",
        });
      }
      return;
    }

    toast.success("Zalogowano pomyślnie");
    router.push("/");
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Witaj ponownie</h1>
        <p className="text-balance text-sm text-muted-foreground">
          Zaloguj się do systemu
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
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Hasło</FormLabel>
                  <Link
                    href="/auth/reset-password"
                    className="ml-auto inline-block text-xs text-muted-foreground underline-offset-4 hover:underline hover:text-primary transition-colors"
                  >
                    Zapomniałeś hasła?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      {...field}
                      placeholder="Hasło"
                      type="password"
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
            {form.formState.isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
