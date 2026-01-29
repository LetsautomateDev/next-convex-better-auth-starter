import { redirect } from "next/navigation";

export default function Page() {
  // Public registration is disabled - users can only access via invitations
  redirect("/auth/sign-in");
}
