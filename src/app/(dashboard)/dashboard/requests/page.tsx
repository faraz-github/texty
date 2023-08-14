import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";

import FriendRequests from "@/components/FriendRequests";

const page = async () => {
  const session = await getServerSession(authOptions);

  if (!session) notFound();

  // Find the id's of people who sent current logged in user a friend requests

  const incomingSenderIds = (await fetchRedis(
    "smembers",
    `user:${session.user.id}:incoming_friend_requests`
  )) as string[];

  const incomingFriendRequests = await Promise.all(
    incomingSenderIds.map(async (senderId) => {
      const senderResult = (await fetchRedis(
        "get",
        `user:${senderId}`
      )) as string;
      const sender = JSON.parse(senderResult) as User;

      return {
        senderId,
        senderEmail: sender.email,
      };
    })
  );

  return (
    <main className="pt-8 ">
      <h1 className="font-bold text-5xl mb-8">Add a friend</h1>
      <div className="flex flex-col gap-4">
        <FriendRequests
          incomingFriendRequests={incomingFriendRequests}
          sessionId={session.user.id}
        />
      </div>
    </main>
  );
};

export default page;
