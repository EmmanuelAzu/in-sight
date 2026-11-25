import { handlers, authEnabled } from "@/auth";
import type { NextRequest } from "next/server";

const off = () => new Response("Sign-in is not configured for this deployment.", { status: 404 });
export const GET = (req: NextRequest) => (authEnabled ? handlers.GET(req) : off());
export const POST = (req: NextRequest) => (authEnabled ? handlers.POST(req) : off());
