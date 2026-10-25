"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState | undefined> {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  try {
    const url = await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
      redirect: false,
    });

    if (url) {
      const parsedUrl = new URL(url, "http://localhost");
      const errorParam = parsedUrl.searchParams.get("error");
      if (errorParam) {
        return { error: "Invalid email or password." };
      }
    }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "An unexpected error occurred. Please try again." };
      }
    }
    throw error;
  }

  redirect(callbackUrl);
}
