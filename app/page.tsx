"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const router = useRouter();

  const [tiendas, setTiendas] = useState<any[]>([]);
  const [selectedTienda, setSelectedTienda] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTiendas = async () => {
      const { data } = await supabase.from("tiendas").select("*");
      if (data) setTiendas(data);
      setLoading(false);
    };
    fetchTiendas();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedTienda || !password) {
      setError("Completá todos los campos.");
      return;
    }

    const tienda = tiendas.find((t) => t.id === selectedTienda);

    if (tienda?.password === password) {
      localStorage.setItem("tienda_id", tienda.id);
      router.push(`/dashboard/${tienda.id}`);
    } else {
      setError("Contraseña incorrecta. Revisá bien.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-slate-200">
        <h1 className="text-2xl md:text-3xl font-black text-center text-slate-800 mb-8">
          Acceso Inventario
        </h1>
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 pl-1">
              Seleccioná tu tienda
            </label>
            <select
              value={selectedTienda}
              onChange={(e) => setSelectedTienda(e.target.value)}
              className="w-full border border-slate-300 rounded-2xl p-4 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">Elegir tienda...</option>
              {tiendas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 pl-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Escribí tu clave aquí..."
              className="w-full border border-slate-300 rounded-2xl p-4 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center font-bold bg-red-50 py-3 rounded-xl border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold rounded-2xl p-4 hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
          >
            Ingresar a la tienda
          </button>
        </form>
      </div>
    </main>
  );
}