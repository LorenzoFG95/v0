import { LoginForm } from "@/components/auth/login-form";
import { Header } from "@/components/header";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="my-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Accedi</h1>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}