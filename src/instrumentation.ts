import type { Instrumentation } from "next";

// Called by Next.js for every unhandled server error (pages, actions, API routes).
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportServerError } = await import("@/lib/error-alerts");
  await reportServerError(err, { path: request.path, method: request.method });
};
