import Link from "next/link";
import { AuthForm } from "@/components/forms";

export const metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl">Create your studio account</h1>
      <div className="mt-8">
        <AuthForm mode="register" />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account? <Link href="/login" className="text-copper">Log in</Link>
      </p>
    </div>
  );
}
