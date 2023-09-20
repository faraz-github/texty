import { getServerSession } from "next-auth";
import { z } from "zod";

import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";

import { db } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { toPusherKey } from "@/lib/utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // validate body as object and id as string using zod
    const { id: idToAdd } = z.object({ id: z.string() }).parse(body);

    // CHECKS BEFORE ACCEPTING A FRIEND REQUEST
    // a) if the request is coming from a logged in user
    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // b) check if both the user are not already friends
    const isAlreadyFriends = await fetchRedis(
      "sismember",
      `user:${session.user.id}:friends`,
      idToAdd
    );
    if (isAlreadyFriends) {
      return new Response("Already friends", { status: 400 });
    }

    // c) check if the friend request actully exist before accepting it
    const hasFriendRequest = await fetchRedis(
      "sismember",
      `user:${session.user.id}:incoming_friend_requests`,
      idToAdd
    );
    if (!hasFriendRequest) {
      return new Response("No friend request", { status: 400 });
    }

    // Doing simultenious calls to improve performance as the y dont rely on each other
    const [userRaw, friendRaw] = (await Promise.all([
      fetchRedis("get", `user:${session.user.id}`),
      fetchRedis("get", `user:${idToAdd}`),
    ])) as [string, string];

    const user = JSON.parse(userRaw) as User;
    const friend = JSON.parse(friendRaw) as User;

    // Notify both the one who added and the one that is added about request accept or deny to update ui
    await Promise.all([
      // Pusher - trigger new friend added
      pusherServer.trigger(
        toPusherKey(`user:${idToAdd}:friends`),
        "new_friend",
        user
      ),
      // Pusher - trigger new friend added
      pusherServer.trigger(
        toPusherKey(`user:${session.user.id}:friends`),
        "new_friend",
        friend
      ),

      // MAKING FRIENDS IN DATABASE
      // Since the friend concept is like if (A is friend of B) then (B is also friend of A)
      // So we first update (A is a friend of B) situation in Database
      db.sadd(`user:${session.user.id}:friends`, idToAdd),
      // Then we update (B is also friend of A) situation in Database
      db.sadd(`user:${idToAdd}:friends`, session.user.id),

      // CLEANUP FRIEND REQUESTS IN DATABASE
      // TODO clean the friend request that is sent
      // await db.srem(`user:${idToAdd}:outbound_friend_requests`, session.user.id);
      // Clean the friend request that is received
      db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd),
    ]);

    return new Response("OK");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", { status: 422 });
    }

    return new Response("Invalid request", { status: 400 });
  }
}
