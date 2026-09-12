import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function OwnProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  redirect(`/profile/${profile.username}`);
}
