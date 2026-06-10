"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// Inicializamos SweetAlert2 para React
const MySwal = withReactContent(Swal);

type Producto = {
  id: string;
  nombre: string;
  cantidad: number;
};

export default function DashboardTienda() {
  const params = useParams();
  const router = useRouter();
  const tienda_id = params.tienda_id as string;

  const [tiendaName, setTiendaName] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nuevoProducto, setNuevoProducto] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: store } = await supabase
        .from("tiendas")
        .select("nombre")
        .eq("id", tienda_id)
        .single();
        
      if (store) setTiendaName(store.nombre);

      const { data: prods } = await supabase
        .from("productos")
        .select("*")
        .eq("tienda_id", tienda_id)
        .order("nombre", { ascending: true });
        
      if (prods) setProductos(prods);
      
      setLoading(false);
    };

    if (tienda_id) {
      fetchData();
    }
  }, [tienda_id]);

  const handleAgregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.trim()) return;

    const { data } = await supabase
      .from("productos")
      .insert([{ tienda_id, nombre: nuevoProducto, cantidad: 0 }])
      .select();

    if (data) {
      setProductos([...productos, data[0]]);
      setNuevoProducto("");
    }
  };

  const actualizarCantidad = async (id: string, actual: number, cambio: number) => {
    const nuevaCantidad = actual + cambio;
    if (nuevaCantidad < 0) return;

    setProductos(productos.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p));

    await supabase
      .from("productos")
      .update({ cantidad: nuevaCantidad })
      .eq("id", id);
  };

  // --- ACÁ ESTÁ EL CAMBIO GROSO ---
  const eliminarProducto = async (id: string, nombreProducto: string) => {
    // Lanzamos el alerta lindo
    MySwal.fire({
      title: <span className="text-slate-800">¿Estás seguro?</span>,
      html: <p className="text-slate-600">Vas a eliminar <strong className="text-indigo-600">{nombreProducto}</strong> del inventario. Esta acción no se puede deshacer.</p>,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5', // Indigo-600
      cancelButtonColor: '#94a3b8', // Slate-400
      confirmButtonText: 'Sí, borrarlo',
      cancelButtonText: 'Cancelar',
      reverseButtons: true, // Ponemos cancelar a la izquierda
      focusCancel: true, // Por seguridad, enfocar cancelar
      customClass: {
        popup: 'rounded-3xl border border-slate-200 shadow-xl',
        confirmButton: 'rounded-2xl px-6 py-3 font-bold',
        cancelButton: 'rounded-2xl px-6 py-3 font-bold',
      }
    }).then(async (result) => {
      // Si el usuario confirmó
      if (result.isConfirmed) {
        // Hacemos el borrado real
        setProductos(productos.filter(p => p.id !== id));
        await supabase.from("productos").delete().eq("id", id);
        
        // Opcional: Mostrar cartelito de éxito
        MySwal.fire({
          title: '¡Borrado!',
          text: 'El producto fue eliminado correctamente.',
          icon: 'success',
          confirmButtonColor: '#4f46e5',
          timer: 1500,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-3xl',
          }
        })
      }
    });
  };
  // --------------------------------

  const cerrarSesion = () => {
    localStorage.removeItem("tienda_id");
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-xl md:text-2xl">📦</span>
          <h1 className="text-base md:text-xl font-black text-slate-800 uppercase tracking-tight">
            Inventario de {tiendaName}
          </h1>
        </div>
        <button 
          onClick={cerrarSesion} 
          className="text-sm md:text-base text-slate-500 font-bold hover:text-red-600 bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors"
        >
          Salir
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-10">
        
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 md:mb-10">
          <h2 className="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Cargar Producto Nuevo</h2>
          <form onSubmit={handleAgregarProducto} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={nuevoProducto}
              onChange={(e) => setNuevoProducto(e.target.value)}
              placeholder="Ej: Remera Negra Talle M..."
              className="flex-1 border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="bg-indigo-600 text-white font-bold rounded-2xl px-8 py-4 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <span>Agregar al stock</span>
              <span className="text-xl leading-none">+</span>
            </button>
          </form>
        </div>

        {/* VISTA DESKTOP */}
        <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider w-1/2">Detalle del Producto</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Stock</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-8 py-12 text-center text-slate-500">No hay productos en el inventario.</td>
                </tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-bold text-slate-800 text-lg">{producto.nombre}</td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-4 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                        <button
                          onClick={() => actualizarCantidad(producto.id, producto.cantidad, -1)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 shadow-sm transition-colors font-black text-xl"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-black text-slate-800 text-2xl tabular-nums">
                          {producto.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidad(producto.id, producto.cantidad, 1)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm transition-colors font-black text-xl"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {/* CAMBIO ACÁ: Pasamos también el nombre */}
                      <button
                        onClick={() => eliminarProducto(producto.id, producto.nombre)}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-3 rounded-xl transition-colors inline-flex items-center justify-center"
                        title="Eliminar producto"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MOBILE */}
        <div className="md:hidden grid gap-4">
          {productos.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
              <p className="text-slate-500">No hay productos cargados.</p>
            </div>
          ) : (
            productos.map((producto) => (
              <div key={producto.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-slate-800 text-lg leading-tight pr-4">{producto.nombre}</h3>
                  {/* CAMBIO ACÁ: Pasamos también el nombre */}
                  <button
                    onClick={() => eliminarProducto(producto.id, producto.nombre)}
                    className="text-slate-400 hover:text-red-500 p-2 -mt-2 -mr-2 bg-slate-50 rounded-xl"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3">Stock actual</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(producto.id, producto.cantidad, -1)}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:bg-slate-100 font-black text-xl shadow-sm"
                    >
                      -
                    </button>
                    <span className="w-10 text-center font-black text-slate-800 text-xl tabular-nums">
                      {producto.cantidad}
                    </span>
                    <button
                      onClick={() => actualizarCantidad(producto.id, producto.cantidad, 1)}
                      className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 active:bg-indigo-100 font-black text-xl shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}