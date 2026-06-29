"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

interface SubmitButtonProps extends ButtonProps {
  pendingLabel?: string;
}

export function SubmitButton({
  children,
  disabled,
  pendingLabel = "Working",
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={disabled || pending} type="submit" {...props}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
