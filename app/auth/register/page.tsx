import { RegisterForm } from "@/components/auth/register-form";
import { Header } from "@/components/header";

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="my-8">
          <h1 className="text-3xl font-bold text-gray-900 text-center mb-6">Crea un Account</h1>
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}