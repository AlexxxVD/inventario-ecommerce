"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

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

  // Nuevos estados para manejar la edición del nombre
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const cargarDatos = async () => {
    const { data: store } = await supabase.from("tiendas").select("nombre").eq("id", tienda_id).single();
    if (store) setTiendaName(store.nombre);

    const { data: prods } = await supabase.from("productos").select("*").eq("tienda_id", tienda_id).order("nombre", { ascending: true });
    if (prods) setProductos(prods);
    
    setLoading(false);
  };

  useEffect(() => {
    if (tienda_id) cargarDatos();
  }, [tienda_id]);

  const handleAgregarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.trim()) return;

    const { data } = await supabase.from("productos").insert([{ tienda_id, nombre: nuevoProducto, cantidad: 0 }]).select();
    if (data) {
      setProductos([...productos, data[0]]);
      setNuevoProducto("");
    }
  };

  const actualizarCantidad = async (id: string, actual: number, cambio: number) => {
    const nuevaCantidad = actual + cambio;
    if (nuevaCantidad < 0) return;

    setProductos(productos.map(p => p.id === id ? { ...p, cantidad: nuevaCantidad } : p));
    await supabase.from("productos").update({ cantidad: nuevaCantidad }).eq("id", id);
  };

  const manejarTipeoManual = (id: string, valorStr: string) => {
    const valor = valorStr === "" ? 0 : parseInt(valorStr);
    if (isNaN(valor) || valor < 0) return;
    setProductos(productos.map(p => p.id === id ? { ...p, cantidad: valor } : p));
  };

  const guardarTipeoDB = async (id: string, cantidadFinal: number) => {
    await supabase.from("productos").update({ cantidad: cantidadFinal }).eq("id", id);
  };

  // --- LÓGICA DE EDICIÓN DE NOMBRE ---
  const iniciarEdicionNombre = (producto: Producto) => {
    setEditingProductId(producto.id);
    setEditNameValue(producto.nombre);
  };

  const confirmarEdicionNombre = async (id: string) => {
    if (!editNameValue.trim()) {
      MySwal.fire({ icon: 'error', title: 'Ups', text: 'El nombre no puede quedar vacío.', confirmButtonColor: '#4f46e5', customClass: { popup: 'rounded-3xl' } });
      return;
    }

    // Actualizamos visualmente al instante
    setProductos(productos.map(p => p.id === id ? { ...p, nombre: editNameValue } : p));
    setEditingProductId(null); // Cerramos el modo edición

    // Guardamos en Supabase
    await supabase.from("productos").update({ nombre: editNameValue }).eq("id", id);
    
    // Un mini cartelito para avisar que se guardó bien
    MySwal.fire({
      title: '¡Nombre actualizado!',
      icon: 'success',
      timer: 1200,
      showConfirmButton: false,
      toast: true,
      position: 'top-end',
      customClass: { popup: 'rounded-2xl' }
    });
  };
  // ------------------------------------

  const eliminarProducto = async (id: string, nombreProducto: string) => {
    MySwal.fire({
      title: <span className="text-slate-800">¿Estás seguro?</span>,
      html: <p className="text-slate-600">Vas a eliminar <strong className="text-indigo-600">{nombreProducto}</strong> del inventario.</p>,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sí, borrarlo',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-3xl border border-slate-200 shadow-xl',
        confirmButton: 'rounded-2xl px-6 py-3 font-bold',
        cancelButton: 'rounded-2xl px-6 py-3 font-bold',
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        setProductos(productos.filter(p => p.id !== id));
        await supabase.from("productos").delete().eq("id", id);
        MySwal.fire({ title: '¡Borrado!', icon: 'success', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-3xl' } });
      }
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-xl md:text-2xl">📦</span>
          <h1 className="text-base md:text-xl font-black text-slate-800 uppercase tracking-tight">Inventario de {tiendaName}</h1>
        </div>
        <button onClick={() => { localStorage.removeItem("tienda_id"); router.push("/"); }} className="text-sm md:text-base text-slate-500 font-bold hover:text-red-600 bg-slate-100 hover:bg-red-50 px-4 py-2 rounded-xl transition-colors">Salir</button>
      </nav>

      <div className="max-w-6xl mx-auto p-4 md:p-10">
        
        {/* Panel de Carga Manual */}
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 mb-8 md:mb-10">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Cargar Producto Nuevo</h2>
          <form onSubmit={handleAgregarProducto} className="flex flex-col sm:flex-row gap-3 items-stretch max-w-2xl">
            <input 
              type="text" 
              value={nuevoProducto} 
              onChange={(e) => setNuevoProducto(e.target.value)} 
              placeholder="Ej: Remera Negra Talle M..." 
              className="flex-1 border border-slate-200 rounded-2xl px-6 py-4 bg-slate-50 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
            />
            <button type="submit" className="bg-indigo-600 text-white font-bold rounded-2xl px-8 py-4 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2">
              <span>Agregar al stock</span><span className="text-xl leading-none">+</span>
            </button>
          </form>
        </div>

        {/* VISTA DESKTOP: TABLA */}
        <div className="hidden md:block bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider w-1/2">Detalle del Producto</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-center">Stock Disponible</th>
                <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.length === 0 ? (
                <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-500">No hay productos en el inventario.</td></tr>
              ) : (
                productos.map((producto) => (
                  <tr key={producto.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      
                      {/* ACÁ RENDERIZAMOS EL INPUT DE EDICIÓN O EL NOMBRE NORMAL */}
                      {editingProductId === producto.id ? (
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={editNameValue}
                            onChange={(e) => setEditNameValue(e.target.value)}
                            className="border-2 border-indigo-500 rounded-xl px-4 py-2 text-lg font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all w-full max-w-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') confirmarEdicionNombre(producto.id);
                              if (e.key === 'Escape') setEditingProductId(null);
                            }}
                          />
                          <button onClick={() => confirmarEdicionNombre(producto.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors" title="Guardar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => setEditingProductId(null)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors" title="Cancelar">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-800 text-lg">{producto.nombre}</span>
                          <button onClick={() => iniciarEdicionNombre(producto)} className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" title="Editar nombre">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                        </div>
                      )}

                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-100 p-2 rounded-2xl border border-slate-200">
                        <button onClick={() => actualizarCantidad(producto.id, producto.cantidad, -1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 shadow-sm font-black text-xl transition-colors">-</button>
                        <input 
                          type="number" 
                          value={producto.cantidad} 
                          onChange={(e) => manejarTipeoManual(producto.id, e.target.value)}
                          onBlur={() => guardarTipeoDB(producto.id, producto.cantidad)}
                          className="w-16 text-center font-black text-slate-800 text-2xl bg-transparent border-none focus:ring-0 outline-none p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button onClick={() => actualizarCantidad(producto.id, producto.cantidad, 1)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 shadow-sm font-black text-xl transition-colors">+</button>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button onClick={() => eliminarProducto(producto.id, producto.nombre)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-3 rounded-xl transition-colors inline-flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MOBILE: TARJETAS */}
        <div className="md:hidden grid gap-4">
          {productos.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-200"><p className="text-slate-500">No hay productos cargados.</p></div>
          ) : (
            productos.map((producto) => (
              <div key={producto.id} className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-4">
                  
                  {/* EDICIÓN DE NOMBRE EN MÓVIL */}
                  {editingProductId === producto.id ? (
                    <div className="flex flex-col gap-2 w-full pr-2">
                      <input 
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        className="border-2 border-indigo-500 rounded-xl px-3 py-2 text-base font-bold text-slate-800 outline-none w-full"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button onClick={() => confirmarEdicionNombre(producto.id)} className="flex-1 py-2 bg-emerald-50 text-emerald-700 font-bold rounded-xl">Guardar</button>
                        <button onClick={() => setEditingProductId(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl">X</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pr-4">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight">{producto.nombre}</h3>
                      <button onClick={() => iniciarEdicionNombre(producto)} className="text-slate-400 hover:text-indigo-600 p-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    </div>
                  )}

                  <button onClick={() => eliminarProducto(producto.id, producto.nombre)} className="text-slate-400 hover:text-red-500 p-2 -mt-2 -mr-2 bg-slate-50 rounded-xl shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-100 mt-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3">Stock actual</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => actualizarCantidad(producto.id, producto.cantidad, -1)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 active:bg-slate-100 font-black text-xl shadow-sm">-</button>
                    <input 
                      type="number" 
                      value={producto.cantidad} 
                      onChange={(e) => manejarTipeoManual(producto.id, e.target.value)}
                      onBlur={() => guardarTipeoDB(producto.id, producto.cantidad)}
                      className="w-14 text-center font-black text-slate-800 text-xl bg-transparent border-none focus:ring-0 outline-none p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button onClick={() => actualizarCantidad(producto.id, producto.cantidad, 1)} className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 active:bg-indigo-100 font-black text-xl shadow-sm">+</button>
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