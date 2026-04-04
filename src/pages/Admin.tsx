import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AcrosoftLogo from "@/components/AcrosoftLogo";

const Admin = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border rounded-xl p-8 w-full max-w-sm space-y-6 shadow-lg">
        <div className="flex justify-center">
          <AcrosoftLogo size="md" />
        </div>
        <h2 className="text-lg font-bold text-center">Acceso exclusivo Acrosoft</h2>
        <div className="space-y-3">
          <Input placeholder="Email" type="email" />
          <Input placeholder="Contraseña" type="password" />
        </div>
        <Button onClick={() => navigate("/dashboard")} className="w-full">
          Ingresar
        </Button>
      </div>
    </div>
  );
};

export default Admin;
