"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Check, UserPlus, X } from "lucide-react";

interface FriendRequestsProps {
  incomingFriendRequests: IncomingFriendRequest[];
  sessionId: string;
}

const FriendRequests = ({
  incomingFriendRequests,
  sessionId,
}: FriendRequestsProps) => {
  const router = useRouter();

  const [friendRequests, setFriendRequests] = useState<IncomingFriendRequest[]>(
    incomingFriendRequests
  );

  const acceptFriend = async (senderId: string) => {
    // From the current friend requests in the database accept one
    await axios.post("/api/friends/accept", { id: senderId });

    // From the local state of all friend requests remove the one accepted
    setFriendRequests((prevState) =>
      prevState.filter((request) => request.senderId !== senderId)
    );

    // Refresh to see updated requests
    router.refresh();
  };

  const denyFriend = async (senderId: string) => {
    // From the current friend requests in the database deny one
    await axios.post("/api/friends/deny", { id: senderId });

    // From the local state of all friend requests remove the one denied
    setFriendRequests((prevState) =>
      prevState.filter((request) => request.senderId !== senderId)
    );

    // Refresh to see updated requests
    router.refresh();
  };

  return (
    <Fragment>
      {friendRequests.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing to show here...</p>
      ) : (
        friendRequests.map((request) => (
          <div key={request.senderId} className="flex gap-4 items-center">
            <UserPlus className="text-black" />
            <p className="font-medium text-lg">{request.senderEmail}</p>
            <button
              onClick={() => acceptFriend(request.senderId)}
              aria-label="accept friend"
              className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 grid place-items-center rounded-full transition hover:shadow-md"
            >
              <Check className="font-semibold text-white w-3/4 h-3/4" />
            </button>
            <button
            onClick={() => denyFriend(request.senderId)}
              aria-label="deny friend"
              className="w-8 h-8 bg-red-600 hover:bg-red-700 grid place-items-center rounded-full transition hover:shadow-md"
            >
              <X className="font-semibold text-white w-3/4 h-3/4" />
            </button>
          </div>
        ))
      )}
    </Fragment>
  );
};

export default FriendRequests;
