import React, { useState, useEffect } from 'react';
import { 
  Coffee, 
  Plus, 
  Edit, 
  Check, 
  Trash2, 
  RefreshCw, 
  X, 
  Link as LinkIcon, 
  DollarSign, 
  Layers,
  Search
} from 'lucide-react';
import type { Product, Category, Ingredient, RecipeItem } from '../../shared/types';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Edit/Create Product Modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  // Recipe Link Modal
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [loadingRecipe, setLoadingRecipe] = useState<boolean>(false);

  const { success, error } = useNotification();
  const { hasPermission } = useAuth();

  useEffect(() => {
    loadMenu();
    loadIngredients();
  }, []);

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await window.api.getAllMenu();
      if (res.success && res.data) {
        setCategories(res.data.categories);
        setProducts(res.data.products);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      const res = await window.api.getIngredients();
      if (res.success && res.data) {
        setIngredients(res.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenEditProduct = (p?: Product) => {
    if (p) {
      setEditingProduct({
        ...p,
        variants: p.variants ? [...p.variants] : [],
        addons: p.addons ? [...p.addons] : [],
      });
    } else {
      setEditingProduct({
        category_id: categories.length > 0 ? categories[0].id : 1,
        name: '',
        description: '',
        base_price: 100,
        hsn_code: '2101',
        tax_rate: 5.0,
        station: 'coffee_counter',
        is_active: 1,
        variants: [],
        addons: [],
      });
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name) return;

    try {
      const res = await window.api.saveProduct(editingProduct as Product);
      if (res.success) {
        success('Menu Updated', `Saved "${editingProduct.name}" successfully.`);
        setEditingProduct(null);
        loadMenu();
      } else {
        error('Save Failed', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const handleOpenRecipeModal = async (product: Product) => {
    setRecipeProduct(product);
    setLoadingRecipe(true);
    try {
      const res = await window.api.getRecipes(product.id);
      if (res.success && res.data) {
        setRecipeItems(res.data);
      }
    } catch (err: any) {
      error('Error', err.message);
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleAddRecipeIngredient = (ingId: number) => {
    const ing = ingredients.find(i => i.id === ingId);
    if (!ing) return;
    setRecipeItems(prev => [
      ...prev,
      {
        id: 0,
        product_id: recipeProduct!.id,
        ingredient_id: ing.id,
        ingredient_name: ing.name,
        quantity_required: 10,
        unit: ing.unit,
      }
    ]);
  };

  const handleRemoveRecipeItem = (index: number) => {
    setRecipeItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    try {
      const res = await window.api.saveRecipe({
        productId: recipeProduct.id,
        items: recipeItems,
      });
      if (res.success) {
        success('Recipe Linked', `Inventory auto-deduction configured for "${recipeProduct.name}".`);
        setRecipeProduct(null);
      } else {
        error('Failed to Save Recipe', res.error);
      }
    } catch (err: any) {
      error('Error', err.message);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchCat = selectedCat === null || p.category_id === selectedCat;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="h-full w-full flex bg-bt-bg overflow-hidden font-mono select-none">
      {/* Category List Sidebar */}
      <div className="w-56 bg-white border-r border-bt-border flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-bt-border flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-bt-charcoal">Categories</span>
          <span className="text-[10px] text-bt-muted">({categories.length})</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-bt-border/60">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full p-3 text-left text-xs font-semibold uppercase transition-colors ${
              selectedCat === null ? 'bg-bt-brick text-white' : 'text-bt-charcoal hover:bg-bt-bg'
            }`}
          >
            All Items
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`w-full p-3 text-left text-xs font-semibold uppercase transition-colors ${
                selectedCat === c.id ? 'bg-bt-brick text-white' : 'text-bt-charcoal hover:bg-bt-bg'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 bg-white border-b border-bt-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Coffee className="w-5 h-5 text-bt-brick" />
            <h2 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
              Menu & Product Catalog
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-bt-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search menu..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-bt-bg border border-bt-border text-xs focus:outline-none focus:border-bt-brick w-56"
              />
            </div>

            {hasPermission('menu:manage') && (
              <button
                onClick={() => handleOpenEditProduct()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Product Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bt-charcoal text-white sticky top-0 z-10 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Base Price</th>
                <th className="py-2.5 px-3">GST Rate</th>
                <th className="py-2.5 px-3">HSN Code</th>
                <th className="py-2.5 px-3">Prep Station</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-bt-border bg-white">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-bt-bg/60 transition-colors">
                  <td className="py-3 px-3 font-bold text-bt-charcoal">
                    {p.name}
                    {p.variants && p.variants.length > 0 && (
                      <span className="block text-[10px] text-bt-muted font-normal">
                        {p.variants.map(v => v.name).join(', ')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-bt-muted">{p.category_name}</td>
                  <td className="py-3 px-3 font-bold text-bt-brick">₹{p.base_price.toFixed(2)}</td>
                  <td className="py-3 px-3 text-bt-muted">{p.tax_rate}%</td>
                  <td className="py-3 px-3 text-bt-muted font-mono">{p.hsn_code}</td>
                  <td className="py-3 px-3 uppercase text-[10px] font-semibold">
                    <span className={`px-2 py-0.5 ${p.station === 'coffee_counter' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                      {p.station === 'coffee_counter' ? 'Coffee Counter' : 'Food Counter'}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 text-[9px] uppercase font-bold ${p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? 'Active' : 'Archived'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenRecipeModal(p)}
                        title="Configure Ingredient Recipe"
                        className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border flex items-center gap-1 px-2 text-[10px]"
                      >
                        <LinkIcon className="w-3 h-3 text-bt-brick" />
                        <span>Recipe</span>
                      </button>
                      {hasPermission('menu:manage') && (
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          title="Edit Product"
                          className="p-1 bg-bt-bg hover:bg-bt-border text-bt-charcoal border border-bt-border"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL: EDIT PRODUCT ================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveProduct} className="bg-white border-2 border-bt-charcoal w-full max-w-xl shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                {editingProduct.id ? 'Edit Menu Product' : 'Add New Menu Product'}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Category *</label>
                  <select
                    value={editingProduct.category_id}
                    onChange={e => setEditingProduct({ ...editingProduct, category_id: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-semibold"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-bt-muted font-bold mb-1">Description</label>
                <input
                  type="text"
                  value={editingProduct.description || ''}
                  onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Base Price (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={editingProduct.base_price}
                    onChange={e => setEditingProduct({ ...editingProduct, base_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-bold text-bt-brick"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingProduct.tax_rate}
                    onChange={e => setEditingProduct({ ...editingProduct, tax_rate: parseFloat(e.target.value) || 5.0 })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={editingProduct.hsn_code || '2101'}
                    onChange={e => setEditingProduct({ ...editingProduct, hsn_code: e.target.value })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Kitchen Prep Station</label>
                  <select
                    value={editingProduct.station || 'coffee_counter'}
                    onChange={e => setEditingProduct({ ...editingProduct, station: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border"
                  >
                    <option value="coffee_counter">Coffee Counter (Barista)</option>
                    <option value="food_counter">Food Counter (Kitchen)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-bt-muted font-bold mb-1">Status</label>
                  <select
                    value={editingProduct.is_active}
                    onChange={e => setEditingProduct({ ...editingProduct, is_active: parseInt(e.target.value, 10) })}
                    className="w-full px-2.5 py-1.5 bg-bt-bg border border-bt-border font-semibold"
                  >
                    <option value="1">Active (Visible in POS)</option>
                    <option value="0">Archived (Hidden)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-bt-border flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL: RECIPE INGREDIENTS LINK ================= */}
      {recipeProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-bt-charcoal w-full max-w-lg shadow-2xl p-6">
            <div className="flex justify-between items-center pb-3 border-b border-bt-border mb-3">
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-bt-charcoal">
                  Configure Recipe Ingredients
                </h3>
                <span className="text-xs text-bt-brick font-semibold">
                  Product: {recipeProduct.name}
                </span>
              </div>
              <button onClick={() => setRecipeProduct(null)} className="p-1 text-bt-muted hover:text-bt-charcoal">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[11px] text-bt-muted mb-3">
              When an order for this item is paid, these exact ingredient quantities will be automatically deducted from inventory.
            </p>

            {/* Existing recipe rows */}
            <div className="space-y-2 max-h-52 overflow-y-auto border border-bt-border p-2 mb-3 text-xs">
              {recipeItems.length === 0 ? (
                <div className="py-6 text-center text-bt-muted">
                  No ingredients linked. Select from below to add.
                </div>
              ) : (
                recipeItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-bt-bg border border-bt-border">
                    <span className="font-bold text-bt-charcoal">{item.ingredient_name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        value={item.quantity_required}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setRecipeItems(prev => prev.map((r, i) => i === index ? { ...r, quantity_required: val } : r));
                        }}
                        className="w-20 px-2 py-1 bg-white border border-bt-border font-bold text-center"
                      />
                      <span className="text-[11px] text-bt-muted w-8">{item.unit}</span>
                      <button
                        onClick={() => handleRemoveRecipeItem(index)}
                        className="p-1 text-bt-concrete hover:text-bt-brick"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add ingredient dropdown */}
            <div className="flex gap-2 mb-4 text-xs">
              <select id="recipeAddSelect" className="flex-1 px-2.5 py-1.5 bg-bt-bg border border-bt-border">
                {ingredients.map(ing => (
                  <option key={ing.id} value={ing.id}>
                    {ing.name} ({ing.unit})
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const selectEl = document.getElementById('recipeAddSelect') as HTMLSelectElement;
                  handleAddRecipeIngredient(parseInt(selectEl.value, 10));
                }}
                className="px-3 py-1.5 bg-bt-charcoal text-white font-bold uppercase hover:bg-bt-brick"
              >
                + Add
              </button>
            </div>

            <div className="pt-3 border-t border-bt-border flex justify-end gap-2">
              <button
                onClick={() => setRecipeProduct(null)}
                className="px-4 py-2 border border-bt-border text-xs uppercase hover:bg-bt-bg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRecipe}
                className="px-6 py-2 bg-bt-brick hover:bg-bt-brick-dark text-white text-xs uppercase font-bold"
              >
                Save Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

