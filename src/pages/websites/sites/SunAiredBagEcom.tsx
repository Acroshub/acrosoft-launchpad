import { useState } from "react";
import {
  ShoppingCart, Search, X, Plus, Minus, Check, ChevronRight,
  Star, Lock, CreditCard, Truck, Shield, SlidersHorizontal,
  ArrowLeft, Package, Phone as PhoneIcon,
} from "lucide-react";
import { C, PHONE } from "../../../brands/sun-aired-bag/brand";
import { StripeRule, LogoPlaceholder } from "../../../brands/sun-aired-bag/components";

// ── TYPES ─────────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  category: string;
  badge?: string;
  desc: string;
  longDesc: string;
  imgId: string;
  extraImgs?: string[];
  variants?: { type: string; options: string[] };
  features: string[];
  rating: number;
  reviews: number;
};

type CartItem = { product: Product; variant: string; qty: number };

// ── PRODUCTS DATA ─────────────────────────────────────────────────────────────

const PRODUCTS: Product[] = [
  {
    id: 1, name: "Product Bag 1", price: 24.99, category: "Standard", badge: "Best Seller",
    desc: "Classic checking bag for high-traffic facilities.",
    longDesc: "Our most popular bag for everyday facility use. Durable nylon construction with reinforced handles and a secure zipper closure. Trusted by 500+ facilities across the US.",
    imgId: "photo-1553062407-98eeb64c6a62",
    variants: { type: "Size", options: ["Small", "Medium", "Large"] },
    features: ["Reinforced handles", "Water-resistant lining", "Numbered tag system", "Machine washable"],
    rating: 4.8, reviews: 124,
  },
  {
    id: 2, name: "Product Bag 2", price: 34.99, originalPrice: 44.99, category: "Heavy Duty", badge: "On Sale",
    desc: "Heavy-duty mesh construction for aquatic centers.",
    longDesc: "Built for the toughest environments. Full mesh body allows air circulation and quick drying after pool use. Rust-proof hardware ensures long-term durability.",
    imgId: "photo-1622560480605-d83c853bc5c3",
    variants: { type: "Size", options: ["Medium", "Large", "XL"] },
    features: ["Full mesh body", "Quick-dry material", "Rust-proof hardware", "Extra-wide opening"],
    rating: 4.7, reviews: 89,
  },
  {
    id: 3, name: "Product Bag 3", price: 39.99, category: "Waterproof",
    desc: "100% waterproof bag for pools and water parks.",
    longDesc: "Fully sealed waterproof exterior keeps contents dry in wet environments. Roll-top closure provides a watertight seal. Certified for aquatic facility use.",
    imgId: "photo-1547949003-9792a18a2601",
    variants: { type: "Color", options: ["Navy", "Black", "Red"] },
    features: ["100% waterproof exterior", "Roll-top closure", "Internal dry pocket", "Shoulder strap included"],
    rating: 4.9, reviews: 67,
  },
  {
    id: 4, name: "Product Bag 4", price: 19.99, category: "Standard",
    desc: "Compact and lightweight day bag for smaller facilities.",
    longDesc: "The perfect solution for facilities with limited storage. Lightweight but durable design folds flat when not in use, saving precious storage space.",
    imgId: "photo-1553062407-98eeb64c6a62",
    features: ["Compact design", "Lightweight nylon", "Quick-access front pocket", "Foldable for storage"],
    rating: 4.5, reviews: 43,
  },
  {
    id: 5, name: "Product Bag 5", price: 299.99, category: "Systems", badge: "Popular",
    desc: "Complete facility rack system with 24 numbered bags.",
    longDesc: "All-in-one solution for facility managers. Includes a wall-mounted rack and individually numbered bags. Easy 30-minute installation with included hardware.",
    imgId: "photo-1519861531473-9200262188bf",
    variants: { type: "Capacity", options: ["12-Unit", "24-Unit", "48-Unit"] },
    features: ["Wall-mounted rack included", "Numbered bags pre-installed", "Easy installation kit", "Expandable modular system"],
    rating: 4.9, reviews: 38,
  },
  {
    id: 6, name: "Product Bag 6", price: 49.99, category: "Premium",
    desc: "Deluxe duffel with premium materials and extra capacity.",
    longDesc: "Our premium offering for upscale facilities. Features reinforced canvas exterior and leather-wrapped handles. Extra storage capacity for larger personal items.",
    imgId: "photo-1553913861-c0fddf2619ee",
    variants: { type: "Size", options: ["Medium", "Large"] },
    features: ["Premium canvas exterior", "Leather-wrapped handles", "Multiple compartments", "Padded shoulder strap"],
    rating: 4.6, reviews: 29,
  },
  {
    id: 7, name: "Product Bag 7", price: 29.99, category: "Security",
    desc: "Lockable security bag for high-value item storage.",
    longDesc: "Designed for facilities requiring enhanced security. Features a lockable zipper system and tamper-evident design. Perfect for correctional facilities and event venues.",
    imgId: "photo-1574180566232-aaad1b5b8450",
    features: ["Lockable zipper system", "Tamper-evident seals", "Cut-resistant strap", "Numbered seal tags included"],
    rating: 4.7, reviews: 52,
  },
  {
    id: 8, name: "Product Bag 8", price: 54.99, category: "Custom", badge: "Custom",
    desc: "Fully customizable bag with your facility logo and colors.",
    longDesc: "Brand your facility with custom logo bags. Choose your colors, add your logo, and create a professional look across your entire operation. Minimum 50 units.",
    imgId: "photo-1584735175097-29f4d9b3e4f5",
    variants: { type: "Color", options: ["Navy Blue", "White", "Gray", "Black"] },
    features: ["Custom logo printing", "Choice of 10+ colors", "Min. 50 units", "3–4 week lead time"],
    rating: 4.8, reviews: 18,
  },
];

const CATEGORIES = ["All", "Standard", "Heavy Duty", "Waterproof", "Systems", "Premium", "Security", "Custom"];

// ── HELPERS ───────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={12} fill={i <= Math.round(rating) ? C.gold : "transparent"}
          style={{ color: i <= Math.round(rating) ? C.gold : "#D1D5DB" }} />
      ))}
    </div>
  );
}

const inputCls: React.CSSProperties = {
  width: "100%", border: `1px solid #D1D5DB`, borderRadius: 6,
  padding: "10px 14px", fontSize: 14, color: C.navy, outline: "none",
  background: "#fff", transition: "border-color 150ms",
};

// ── NAV ───────────────────────────────────────────────────────────────────────

function EcomNav({
  cartCount, onCartOpen, onHome,
}: {
  cartCount: number;
  onCartOpen: () => void;
  onHome: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b" style={{ borderColor: "#E0E4EF" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center gap-4">
        <button onClick={onHome} className="cursor-pointer shrink-0">
          <LogoPlaceholder />
        </button>

        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
            <input
              type="text"
              placeholder="Search bags, systems..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded border outline-none"
              style={{ borderColor: "#E0E4EF", background: "#F9FAFB", color: C.navy }}
            />
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 ml-auto">
          <a href={`tel:${PHONE}`} className="text-sm font-bold cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: C.navy }}>{PHONE}</a>
        </nav>

        <button
          onClick={onCartOpen}
          className="relative ml-auto md:ml-4 w-10 h-10 flex items-center justify-center rounded cursor-pointer hover:opacity-80 transition-opacity"
          style={{ background: C.navy }}
        >
          <ShoppingCart size={18} className="text-white" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-[10px] font-black flex items-center justify-center"
              style={{ background: C.gold }}>
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

// ── CART SIDEBAR ──────────────────────────────────────────────────────────────

function CartSidebar({
  open, onClose, items, onUpdateQty, onRemove, onCheckout,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (id: number, variant: string, delta: number) => void;
  onRemove: (id: number, variant: string) => void;
  onCheckout: () => void;
}) {
  const total = items.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#E0E4EF" }}>
          <h2 className="font-black text-lg" style={{ color: C.navy }}>Your Cart ({items.length})</h2>
          <button onClick={onClose} className="cursor-pointer hover:opacity-60 transition-opacity">
            <X size={20} style={{ color: C.navy }} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingCart size={40} style={{ color: "#D1D5DB" }} />
            <p className="font-bold text-sm" style={{ color: "#9CA3AF" }}>Your cart is empty</p>
            <button onClick={onClose}
              className="text-sm font-black px-6 py-2.5 rounded text-white cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: C.navy }}>
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {items.map(item => (
                <div key={`${item.product.id}-${item.variant}`} className="flex gap-3">
                  <img
                    src={`https://images.unsplash.com/${item.product.imgId}?auto=format&fit=crop&w=80&q=80`}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm leading-snug truncate" style={{ color: C.navy }}>{item.product.name}</p>
                    {item.variant && <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{item.variant}</p>}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 border rounded" style={{ borderColor: "#E0E4EF" }}>
                        <button onClick={() => onUpdateQty(item.product.id, item.variant, -1)}
                          className="w-7 h-7 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity">
                          <Minus size={12} />
                        </button>
                        <span className="w-6 text-center text-sm font-bold" style={{ color: C.navy }}>{item.qty}</span>
                        <button onClick={() => onUpdateQty(item.product.id, item.variant, 1)}
                          className="w-7 h-7 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity">
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="font-black text-sm" style={{ color: C.navy }}>
                        ${(item.product.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => onRemove(item.product.id, item.variant)}
                    className="shrink-0 cursor-pointer hover:opacity-60 transition-opacity mt-0.5">
                    <X size={14} style={{ color: "#9CA3AF" }} />
                  </button>
                </div>
              ))}
            </div>

            <div className="px-5 py-4 border-t" style={{ borderColor: "#E0E4EF" }}>
              <div className="flex justify-between mb-1 text-sm">
                <span style={{ color: "#6B7280" }}>Subtotal</span>
                <span className="font-bold" style={{ color: C.navy }}>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mb-4 text-sm">
                <span style={{ color: "#6B7280" }}>Shipping</span>
                <span className="font-bold text-green-600">Free</span>
              </div>
              <div className="flex justify-between mb-5 text-base font-black" style={{ color: C.navy }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <button onClick={onCheckout}
                className="w-full flex items-center justify-center gap-2 text-white font-black py-3.5 rounded cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: C.navy }}>
                <Lock size={14} /> Proceed to Checkout
              </button>
              <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
                Secure checkout · SSL encrypted
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────

function HomeView({ onProduct }: { onProduct: (p: Product) => void }) {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: "55vh" }}>
        <div className="absolute inset-0">
          <img
            src="/images/hero-bag.jpg"
            alt="Sun Aired Bag Co."
            className="w-full h-full object-cover"
            style={{ objectPosition: "60% center" }}
          />
          <div className="absolute inset-0" style={{
            background: "linear-gradient(to right, rgba(4,9,87,0.88) 0%, rgba(4,9,87,0.65) 45%, rgba(4,9,87,0.25) 80%, rgba(4,9,87,0.05) 100%)"
          }} />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-16 md:pt-20 md:pb-20 flex items-center" style={{ minHeight: "55vh" }}>
          <div className="max-w-xl">
            <StripeRule color="#fff" />
            <p className="text-xs font-black tracking-widest uppercase mt-4 mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
              Since 1947 · Professional Grade
            </p>
            <h1 className="text-[clamp(2.4rem,5vw,3.6rem)] font-black leading-[1.05] tracking-tight mb-4 text-white">
              Professional<br />Bag Systems for<br />Demanding Facilities.
            </h1>
            <p className="text-base" style={{ color: "rgba(255,255,255,0.72)" }}>
              Trusted by 500+ facilities across all 50 states.
            </p>
          </div>
        </div>
      </section>

      {/* Catalog inline */}
      <CatalogView onProduct={onProduct} />
    </div>
  );
}


// ── CATALOG VIEW ──────────────────────────────────────────────────────────────

function CatalogView({ onProduct }: { onProduct: (p: Product) => void }) {
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState(500);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = PRODUCTS
    .filter(p => category === "All" || p.category === category)
    .filter(p => p.price <= maxPrice)
    .sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      return 0;
    });

  const FilterPanel = () => (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.navy }}>Category</p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="flex items-center gap-2 text-sm py-1.5 px-2 rounded text-left cursor-pointer transition-colors"
              style={{
                background: category === cat ? C.navy : "transparent",
                color: category === cat ? "#fff" : C.navy,
                fontWeight: category === cat ? 900 : 400,
              }}>
              {category === cat && <Check size={12} />}
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: C.navy }}>
          Max Price: <span style={{ color: C.gold }}>${maxPrice}</span>
        </p>
        <input type="range" min={10} max={500} step={10}
          value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full cursor-pointer"
          style={{ accentColor: C.navy }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: "#9CA3AF" }}>
          <span>$10</span><span>$500</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <div className="mb-8">
        <StripeRule />
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: C.gold }}>All Products</p>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: C.navy }}>Shop Bag Systems</h1>
          </div>
          <p className="text-sm" style={{ color: "#6B7280" }}>{filtered.length} products</p>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="md:hidden mb-4 flex gap-3">
        <button onClick={() => setFiltersOpen(v => !v)}
          className="flex items-center gap-2 text-sm font-black px-4 py-2.5 rounded border cursor-pointer"
          style={{ borderColor: C.navy, color: C.navy }}>
          <SlidersHorizontal size={14} /> Filters
        </button>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="flex-1 text-sm font-bold px-3 py-2.5 rounded border cursor-pointer outline-none"
          style={{ borderColor: "#E0E4EF", color: C.navy }}>
          <option value="featured">Featured</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="rating">Top Rated</option>
        </select>
      </div>

      {filtersOpen && (
        <div className="md:hidden mb-6 p-5 rounded-lg border" style={{ borderColor: "#E0E4EF", background: "#F9FAFB" }}>
          <FilterPanel />
        </div>
      )}

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-52 shrink-0">
          <div className="sticky top-24">
            <FilterPanel />
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          <div className="hidden md:flex justify-end mb-6">
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="text-sm font-bold px-3 py-2 rounded border cursor-pointer outline-none"
              style={{ borderColor: "#E0E4EF", color: C.navy }}>
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <Package size={40} style={{ color: "#D1D5DB", margin: "0 auto 12px" }} />
              <p className="font-bold" style={{ color: "#9CA3AF" }}>No products match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map(p => (
                <button key={p.id} onClick={() => onProduct(p)}
                  className="text-left group cursor-pointer border rounded-lg overflow-hidden hover:shadow-md transition-all duration-200"
                  style={{ borderColor: "#E0E4EF" }}>
                  <div className="relative h-40 md:h-48 overflow-hidden">
                    <img
                      src={`https://images.unsplash.com/${p.imgId}?auto=format&fit=crop&w=400&q=80`}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {p.badge && (
                      <span className="absolute top-2 left-2 text-[10px] font-black uppercase px-2 py-0.5 rounded"
                        style={{ background: p.badge === "On Sale" ? "#EF4444" : C.gold, color: "#fff" }}>
                        {p.badge}
                      </span>
                    )}
                    {p.variants && (
                      <span className="absolute bottom-2 right-2 text-[10px] font-black uppercase px-2 py-0.5 rounded"
                        style={{ background: "rgba(4,9,87,0.8)", color: "#fff" }}>
                        {p.variants.options.length} {p.variants.type}s
                      </span>
                    )}
                  </div>
                  <div className="p-4 border-t-2" style={{ borderColor: C.navy }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Stars rating={p.rating} />
                      <span className="text-[10px]" style={{ color: "#9CA3AF" }}>({p.reviews})</span>
                    </div>
                    <p className="font-black text-sm mb-1 leading-snug" style={{ color: C.navy }}>{p.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-black text-sm" style={{ color: C.navy }}>${p.price.toFixed(2)}</span>
                      {p.originalPrice && (
                        <span className="text-xs line-through" style={{ color: "#9CA3AF" }}>${p.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PRODUCT DETAIL VIEW ───────────────────────────────────────────────────────

function ProductView({
  product, onBack, onAddToCart,
}: {
  product: Product;
  onBack: () => void;
  onAddToCart: (p: Product, variant: string, qty: number) => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.options[0] ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product, selectedVariant, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold mb-8 cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: C.navy }}>
        <ArrowLeft size={15} /> Back to Shop
      </button>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Image */}
        <div className="rounded-lg overflow-hidden border" style={{ borderColor: "#E0E4EF" }}>
          <img
            src={`https://images.unsplash.com/${product.imgId}?auto=format&fit=crop&w=700&q=85`}
            alt={product.name}
            className="w-full h-80 md:h-[460px] object-cover"
          />
        </div>

        {/* Info */}
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: C.gold }}>
            {product.category}
          </p>
          <h1 className="text-3xl font-black tracking-tight mb-3" style={{ color: C.navy }}>{product.name}</h1>

          <div className="flex items-center gap-3 mb-4">
            <Stars rating={product.rating} />
            <span className="text-sm" style={{ color: "#6B7280" }}>{product.rating} ({product.reviews} reviews)</span>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl font-black" style={{ color: C.navy }}>${product.price.toFixed(2)}</span>
            {product.originalPrice && (
              <>
                <span className="text-lg line-through" style={{ color: "#9CA3AF" }}>${product.originalPrice.toFixed(2)}</span>
                <span className="text-sm font-black px-2 py-0.5 rounded" style={{ background: "#FEE2E2", color: "#EF4444" }}>
                  {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          <p className="text-sm leading-relaxed mb-6" style={{ color: "#6B7280" }}>{product.longDesc}</p>

          {/* Variants */}
          {product.variants && (
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: C.navy }}>
                {product.variants.type}: <span style={{ color: C.gold }}>{selectedVariant}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.options.map(opt => (
                  <button key={opt} onClick={() => setSelectedVariant(opt)}
                    className="px-4 py-2 text-sm font-bold rounded border cursor-pointer transition-all"
                    style={{
                      borderColor: selectedVariant === opt ? C.navy : "#E0E4EF",
                      background: selectedVariant === opt ? C.navy : "#fff",
                      color: selectedVariant === opt ? "#fff" : C.navy,
                    }}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty */}
          <div className="flex items-center gap-4 mb-6">
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: C.navy }}>Quantity</p>
            <div className="flex items-center border rounded" style={{ borderColor: "#E0E4EF" }}>
              <button onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity">
                <Minus size={13} />
              </button>
              <span className="w-10 text-center font-black text-sm" style={{ color: C.navy }}>{qty}</span>
              <button onClick={() => setQty(q => q + 1)}
                className="w-9 h-9 flex items-center justify-center cursor-pointer hover:opacity-60 transition-opacity">
                <Plus size={13} />
              </button>
            </div>
          </div>

          {/* Add to cart */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <button onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 text-white font-black py-4 rounded cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: added ? "#16A34A" : C.navy }}>
              {added ? <><Check size={16} /> Added to Cart!</> : <><ShoppingCart size={16} /> Add to Cart</>}
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 text-white font-black py-4 rounded cursor-pointer hover:opacity-90 transition-opacity"
              style={{ background: C.gold }}>
              Buy Now
            </button>
          </div>

          {/* Features */}
          <div className="rounded-lg p-5" style={{ background: "#F9FAFB", border: "1px solid #E0E4EF" }}>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: C.navy }}>Features</p>
            <div className="flex flex-col gap-2">
              {product.features.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "#374151" }}>
                  <Check size={13} style={{ color: C.gold }} className="shrink-0" /> {f}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs" style={{ color: "#9CA3AF" }}>
            <span className="flex items-center gap-1"><Truck size={12} /> Free shipping over $75</span>
            <span className="flex items-center gap-1"><Shield size={12} /> Quality guarantee</span>
            <span className="flex items-center gap-1"><Lock size={12} /> Secure checkout</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CHECKOUT VIEW ─────────────────────────────────────────────────────────────

function CheckoutView({
  items, onConfirm, onBack,
}: {
  items: CartItem[];
  onConfirm: () => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState<"info" | "payment">("info");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState({ email: "", firstName: "", lastName: "", address: "", city: "", state: "", zip: "" });
  const [card, setCard] = useState({ number: "", expiry: "", cvc: "", name: "" });

  const subtotal = items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const tax = subtotal * 0.085;
  const total = subtotal + tax;

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { setLoading(false); onConfirm(); }, 1800);
  };

  const formatCard = (v: string) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const formatExpiry = (v: string) => v.replace(/\D/g, "").slice(0, 4).replace(/(.{2})/, "$1/");

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm font-bold mb-8 cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: C.navy }}>
        <ArrowLeft size={15} /> Back to Cart
      </button>

      {/* Steps */}
      <div className="flex items-center gap-3 mb-10">
        {(["info", "payment"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black`}
              style={{
                background: step === s || (s === "info" && step === "payment") ? C.navy : "#E0E4EF",
                color: step === s || (s === "info" && step === "payment") ? "#fff" : "#9CA3AF",
              }}>
              {s === "info" && step === "payment" ? <Check size={12} /> : i + 1}
            </div>
            <span className="text-sm font-bold capitalize" style={{ color: step === s ? C.navy : "#9CA3AF" }}>
              {s === "info" ? "Shipping" : "Payment"}
            </span>
            {i < 1 && <ChevronRight size={14} style={{ color: "#D1D5DB" }} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-10">
        {/* Form */}
        <div>
          {step === "info" ? (
            <form onSubmit={e => { e.preventDefault(); setStep("payment"); }}>
              <h2 className="text-xl font-black mb-6" style={{ color: C.navy }}>Shipping Information</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>Email</label>
                  <input required type="email" placeholder="you@facility.com" value={info.email}
                    onChange={e => setInfo({ ...info, email: e.target.value })} style={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>First Name</label>
                    <input required type="text" placeholder="John" value={info.firstName}
                      onChange={e => setInfo({ ...info, firstName: e.target.value })} style={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>Last Name</label>
                    <input required type="text" placeholder="Smith" value={info.lastName}
                      onChange={e => setInfo({ ...info, lastName: e.target.value })} style={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>Address</label>
                  <input required type="text" placeholder="123 Main St" value={info.address}
                    onChange={e => setInfo({ ...info, address: e.target.value })} style={inputCls} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>City</label>
                    <input required type="text" placeholder="Los Angeles" value={info.city}
                      onChange={e => setInfo({ ...info, city: e.target.value })} style={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>State</label>
                    <input required type="text" placeholder="CA" value={info.state}
                      onChange={e => setInfo({ ...info, state: e.target.value })} style={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>ZIP</label>
                    <input required type="text" placeholder="90210" value={info.zip}
                      onChange={e => setInfo({ ...info, zip: e.target.value })} style={inputCls} />
                  </div>
                </div>
                <button type="submit"
                  className="w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded cursor-pointer hover:opacity-90 transition-opacity mt-2"
                  style={{ background: C.navy }}>
                  Continue to Payment <ChevronRight size={16} />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePay}>
              <h2 className="text-xl font-black mb-6" style={{ color: C.navy }}>Payment Details</h2>

              {/* Stripe-style card element */}
              <div className="rounded-lg border overflow-hidden mb-4" style={{ borderColor: "#E0E4EF" }}>
                <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "#E0E4EF", background: "#F9FAFB" }}>
                  <div className="flex items-center gap-2">
                    <Lock size={13} style={{ color: "#6B7280" }} />
                    <span className="text-xs font-bold" style={{ color: "#6B7280" }}>Secure card payment</span>
                  </div>
                  <div className="flex gap-2">
                    {["VISA", "MC", "AMEX"].map(b => (
                      <span key={b} className="text-[9px] font-black px-1.5 py-0.5 rounded border"
                        style={{ borderColor: "#E0E4EF", color: "#9CA3AF" }}>{b}</span>
                    ))}
                  </div>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                      Card Number
                    </label>
                    <div className="relative">
                      <input required type="text" placeholder="1234 5678 9012 3456"
                        value={card.number}
                        onChange={e => setCard({ ...card, number: formatCard(e.target.value) })}
                        style={{ ...inputCls, paddingRight: 40 }} />
                      <CreditCard size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#D1D5DB" }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>Expiry</label>
                      <input required type="text" placeholder="MM/YY"
                        value={card.expiry}
                        onChange={e => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
                        style={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>
                        CVC <span style={{ color: "#D1D5DB" }}>(?)</span>
                      </label>
                      <input required type="text" placeholder="123" maxLength={4}
                        value={card.cvc}
                        onChange={e => setCard({ ...card, cvc: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                        style={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1.5" style={{ color: "#6B7280" }}>Name on Card</label>
                    <input required type="text" placeholder="John Smith"
                      value={card.name}
                      onChange={e => setCard({ ...card, name: e.target.value })}
                      style={inputCls} />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-black py-4 rounded cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-70"
                style={{ background: C.navy }}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</span>
                  : <><Lock size={15} /> Pay ${total.toFixed(2)}</>}
              </button>
              <p className="text-center text-xs mt-3" style={{ color: "#9CA3AF" }}>
                Your payment is encrypted and secure. We never store card details.
              </p>
              <button type="button" onClick={() => setStep("info")}
                className="w-full text-center text-xs mt-2 cursor-pointer hover:opacity-60 transition-opacity"
                style={{ color: "#9CA3AF" }}>
                ← Back to shipping
              </button>
            </form>
          )}
        </div>

        {/* Order Summary */}
        <div className="order-first lg:order-last">
          <div className="rounded-lg border p-5 sticky top-24" style={{ borderColor: "#E0E4EF", background: "#F9FAFB" }}>
            <h3 className="font-black mb-4" style={{ color: C.navy }}>Order Summary</h3>
            <div className="flex flex-col gap-3 mb-4">
              {items.map(item => (
                <div key={`${item.product.id}-${item.variant}`} className="flex gap-3">
                  <div className="relative shrink-0">
                    <img
                      src={`https://images.unsplash.com/${item.product.imgId}?auto=format&fit=crop&w=56&q=80`}
                      alt={item.product.name}
                      className="w-14 h-14 object-cover rounded border"
                      style={{ borderColor: "#E0E4EF" }}
                    />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white"
                      style={{ background: C.navy }}>{item.qty}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs leading-snug truncate" style={{ color: C.navy }}>{item.product.name}</p>
                    {item.variant && <p className="text-[10px]" style={{ color: "#9CA3AF" }}>{item.variant}</p>}
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: C.navy }}>
                    ${(item.product.price * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 flex flex-col gap-2" style={{ borderColor: "#E0E4EF" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6B7280" }}>Subtotal</span>
                <span className="font-bold" style={{ color: C.navy }}>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6B7280" }}>Shipping</span>
                <span className="font-bold text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: "#6B7280" }}>Tax (8.5%)</span>
                <span className="font-bold" style={{ color: C.navy }}>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-base pt-2 border-t" style={{ color: C.navy, borderColor: "#E0E4EF" }}>
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CONFIRMATION VIEW ─────────────────────────────────────────────────────────

function ConfirmationView({ onShop }: { onShop: () => void }) {
  const orderNum = `SAB-${Math.floor(100000 + Math.random() * 900000)}`;
  return (
    <div className="max-w-lg mx-auto px-6 py-20 text-center">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: C.navy }}>
        <Check size={36} className="text-white" />
      </div>
      <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: C.gold }}>Order Confirmed</p>
      <h1 className="text-3xl font-black mb-3" style={{ color: C.navy }}>Thank You!</h1>
      <p className="text-sm mb-2" style={{ color: "#6B7280" }}>
        Your order <span className="font-black" style={{ color: C.navy }}>{orderNum}</span> has been placed.
      </p>
      <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
        A confirmation email has been sent. Your order ships within 3–5 business days.
      </p>
      <div className="rounded-lg border p-5 mb-8 text-left" style={{ borderColor: "#E0E4EF", background: "#F9FAFB" }}>
        <div className="flex flex-col gap-3">
          {[
            { Icon: Check, label: "Order Confirmed", sub: "We've received your order" },
            { Icon: Package, label: "Processing", sub: "Usually 1 business day" },
            { Icon: Truck, label: "Shipped", sub: "3–5 business days" },
          ].map(({ Icon, label, sub }, i) => (
            <div key={label} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0`}
                style={{ background: i === 0 ? C.navy : "#E0E4EF" }}>
                <Icon size={14} style={{ color: i === 0 ? "#fff" : "#9CA3AF" }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: i === 0 ? C.navy : "#9CA3AF" }}>{label}</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onShop}
          className="flex-1 flex items-center justify-center gap-2 text-white font-black py-4 rounded cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: C.navy }}>
          Continue Shopping
        </button>
        <a href={`tel:${PHONE}`}
          className="flex-1 flex items-center justify-center gap-2 font-black py-4 rounded border cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderColor: C.navy, color: C.navy }}>
          <PhoneIcon size={15} /> {PHONE}
        </a>
      </div>
    </div>
  );
}

// ── FOOTER ────────────────────────────────────────────────────────────────────

function EcomFooter() {
  return (
    <footer style={{ background: C.navy }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <LogoPlaceholder dark />
          <p className="mt-4 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
            Professional bag systems for demanding facilities since 1947.
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Contact</p>
          <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.7)" }}>{PHONE}</p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>Redondo Beach, CA 90277</p>
        </div>
      </div>
      <div className="border-t max-w-7xl mx-auto px-6 py-4 flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>© 2026 Sun Aired Bag Co. All rights reserved.</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Website by <span style={{ color: "rgba(255,255,255,0.45)" }}>Acrosoft Labs</span>
        </p>
      </div>
    </footer>
  );
}

// ── MAIN SPA ──────────────────────────────────────────────────────────────────

type View = "home" | "product" | "checkout" | "confirmation";

export default function SunAiredBagEcom() {
  const [view, setView] = useState<View>("home");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const goHome = () => setView("home");

  const goProduct = (p: Product) => {
    setSelectedProduct(p);
    setView("product");
    window.scrollTo(0, 0);
  };

  const addToCart = (p: Product, variant: string, qty: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === p.id && i.variant === variant);
      if (existing) {
        return prev.map(i =>
          i.product.id === p.id && i.variant === variant
            ? { ...i, qty: i.qty + qty }
            : i
        );
      }
      return [...prev, { product: p, variant, qty }];
    });
    setCartOpen(true);
  };

  const updateQty = (id: number, variant: string, delta: number) => {
    setCart(prev => prev.map(i =>
      i.product.id === id && i.variant === variant
        ? { ...i, qty: Math.max(1, i.qty + delta) }
        : i
    ).filter(i => i.qty > 0));
  };

  const removeItem = (id: number, variant: string) => {
    setCart(prev => prev.filter(i => !(i.product.id === id && i.variant === variant)));
  };

  const goCheckout = () => {
    setCartOpen(false);
    setView("checkout");
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <EcomNav
        cartCount={cartCount}
        onCartOpen={() => setCartOpen(true)}
        onHome={goHome}
      />

      <CartSidebar
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQty={updateQty}
        onRemove={removeItem}
        onCheckout={goCheckout}
      />

      <main className="flex-1">
        {view === "home" && <HomeView onProduct={goProduct} />}
        {view === "product" && selectedProduct && (
          <ProductView product={selectedProduct} onBack={goHome} onAddToCart={addToCart} />
        )}
        {view === "checkout" && (
          <CheckoutView
            items={cart}
            onConfirm={() => { setCart([]); setView("confirmation"); window.scrollTo(0, 0); }}
            onBack={() => { setCartOpen(true); setView("home"); }}
          />
        )}
        {view === "confirmation" && <ConfirmationView onShop={goHome} />}
      </main>

      <EcomFooter />
    </div>
  );
}
