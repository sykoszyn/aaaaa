import { UserPlus } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_online: boolean;
}

export function FriendsOnlineList({ friends }: { friends: Friend[] }) {
  if (friends.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Todavía no agregaste amigos"
        description="Buscalos por su usuario para jugar juntos."
        action={
          <Link href="/friends">
            <Button size="sm" variant="secondary">
              Buscar amigos
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {friends.map((friend) => (
        <li key={friend.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-3/60">
          <Avatar src={friend.avatar_url} name={friend.display_name} size={32} online={friend.is_online} />
          <div>
            <p className="text-sm font-medium text-text">{friend.display_name}</p>
            <p className="text-xs text-text-faint">{friend.is_online ? "En línea" : "Desconectado"}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
