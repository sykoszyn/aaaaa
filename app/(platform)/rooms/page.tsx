import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { JoinByCodeForm } from "@/components/rooms/join-by-code-form";
import { PublicRoomsList } from "@/components/rooms/public-rooms-list";
import { listPublicRooms } from "@/lib/rooms/queries";

export const metadata: Metadata = { title: "Salas" };

export default async function RoomsPage() {
  const rooms = await listPublicRooms(30);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Salas públicas</h1>
        <p className="mt-1 text-text-dim">Uníte a una partida abierta o entrá con el código que te compartieron.</p>
      </div>

      <Card className="max-w-sm">
        <CardContent className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-text">Tengo un código</h2>
          <JoinByCodeForm />
        </CardContent>
      </Card>

      <PublicRoomsList rooms={rooms} />
    </div>
  );
}
