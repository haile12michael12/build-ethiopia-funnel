import Link from "next/link";
import { AuthForm } from "@/components/forms";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-4xl">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">Demo buyer: demo@digitalforge.dev / Demo1234! · Admin: admin@digitalforge.dev / ForgeAdmin!23</p>
      <div className="mt-8">
        <AuthForm mode="login" />
      </div>
      <p className="mt-6 text-center text-sm text-muted">
        New here? <Link href="/register" className="text-copper">Create an account</Link>
      </p>
    </div>
  );
}
