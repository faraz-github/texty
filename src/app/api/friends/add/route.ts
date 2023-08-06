import { fetchRedis } from "@/helpers/redis";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addFriendValidator } from "@/lib/validations/add-friend";
import { getServerSession } from "next-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    /**
     * Steps for sending friend request
     * Step 1: find a unique id associated with each user in the redis upstash database
     * Step 2: check if the request is coming from a logged in user using session
     * Step 3: check if the friend request is already sent
     * Step 4: check if already a friend
     * Step 5: send request
     */

    const body = await req.json();
    const { email: emailToAdd } = addFriendValidator.parse(body.email); // revalidate on server

    /**
     * REDIS USAGE WITHOUT HELPER
     */
    // const RESTResponse = await fetch(
    //   `${process.env.UPSTASH_REDIS_REST_URL}/get/user:email:${emailToAdd}`,
    //   {
    //     headers: {
    //       Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
    //     },
    //     cache: "no-store", // to avoid stale data
    //   }
    // );

    // const data = (await RESTResponse.json()) as { result: string };
    // const idToAdd = data.result;

    const idToAdd = (await fetchRedis(
      "get",
      `user:email:${emailToAdd}`
    )) as string;

    if (!idToAdd) {
      return new Response("This person does not exist.", { status: 400 });
    }

    const session = await getServerSession(authOptions);

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (idToAdd === session.user.id) {
      return new Response("You cannot add yourself as a friend", {
        status: 400,
      });
    }

    const isAlreadyAdded = (await fetchRedis(
      "sismember",
      `user:${idToAdd}:incoming_friend_requests`,
      session.user.id
    )) as 0 | 1; // because the response would be Promise

    if (isAlreadyAdded) {
      return new Response("Already added this user", { status: 400 });
    }

    const isAlreadyFriends = (await fetchRedis(
      "sismember",
      `user:${session.user.id}:friends`,
      idToAdd
    )) as 0 | 1; // because the response would be Promise

    if (isAlreadyFriends) {
      return new Response("Already friend with this user", { status: 400 });
    }

    // Valid request

    db.sadd(`user:${idToAdd}:incoming_friend_requests`, session.user.id);

    return new Response("OK");
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response("Invalid request payload", {
        status: 422,
      });
    }

    return new Response("Invalid request", { status: 400 });
  }
}
