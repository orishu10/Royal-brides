"use client";

import { startTransition, useActionState } from "react";

/**
 * Like useActionState, but the form keeps its values when the action returns an error
 * (React's default <form action> resets every field after submit).
 * Usage: const [state, onSubmit, pending] = useFormAction(action, null);  <form onSubmit={onSubmit}>
 */
export function useFormAction<S>(action: (prev: Awaited<S>, formData: FormData) => Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
