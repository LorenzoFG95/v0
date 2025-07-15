"use client"

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [telefono, setTelefono] = useState(""); // Nuovo campo
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // 1. Registra l'utente con Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
            cognome,
          },
        },
      });
  
      if (authError) throw authError;
  
      // 2. Controlla se l'utente è già confermato o se serve conferma email
      if (authData.user && !authData.session) {
        // L'utente deve confermare l'email
        router.push("/auth/login?message=Controlla la tua email per confermare l'account");
        return;
      }
  
      // 3. Se l'utente è già confermato, crea il profilo
      if (authData.user && authData.session) {
        const { error: profileError } = await supabase
          .from("utente")
          .insert([
            {
              id: authData.user.id,
              email: authData.user.email,
              nome,
              cognome,
              telefono,
              data_registrazione: new Date().toISOString(),
              attivo: true,
            },
          ]);
  
        if (profileError) throw profileError;
        
        // 4. Reindirizza alla homepage (l'utente è già loggato)
        router.push("/");
      }
    } catch (error: any) {
      setError(error.message || "Si è verificato un errore durante la registrazione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Registrazione</CardTitle>
        <CardDescription>
          Crea un account per accedere a tutte le funzionalità
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                placeholder="Mario"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cognome">Cognome</Label>
              <Input
                id="cognome"
                placeholder="Rossi"
                value={cognome}
                onChange={(e) => setCognome(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="mario.rossi@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrazione in corso..." : "Registrati"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-gray-500">
          Hai già un account?{" "}
          <Button variant="link" className="p-0" onClick={() => router.push("/auth/login")}>
            Accedi
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}