"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function sendFriendRequest(receiverUsername: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: receiver } = await supabase.from("profiles").select("id").eq("username", receiverUsername).single();
  if (!receiver) throw new Error("No existe ese usuario");
  if (receiver.id === profile.id) throw new Error("No podés agregarte a vos mismo");

  const { error } = await supabase.from("friend_requests").insert({ sender_id: profile.id, receiver_id: receiver.id });
  if (error) throw new Error("Ya le enviaste una solicitud o ya son amigos");

  revalidatePath("/friends");
}

export async function respondFriendRequest(requestId: string, accept: boolean) {
  await requireProfile();
  const supabase = await createClient();

  await supabase
    .from("friend_requests")
    .update({ status: accept ? "accepted" : "declined" })
    .eq("id", requestId);

  revalidatePath("/friends");
}

export async function removeFriend(friendRowId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("friends").delete().eq("id", friendRowId);
  revalidatePath("/friends");
}
