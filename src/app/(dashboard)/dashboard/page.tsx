import React from "react";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";

type Props = {};

const page = async (props: Props) => {
  const session = await getServerSession(authOptions);

  return <pre>{JSON.stringify(session)}</pre>;
};

export default page;
