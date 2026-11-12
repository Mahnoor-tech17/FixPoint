import React, { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import Spinner from "../../components/common/Spinner";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import StarRating from "../../components/common/StarRating";
import { httpClient } from "../../lib/http";
import CustomerLayout from "../../components/customer/CustomerLayout";

export default function SearchPage({ insideCustomerLayout: insideCustomerLayoutProp = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  // /customer/search par hamesha customer layout (sidebar) dikhao
  const insideCustomerLayout =
    insideCustomerLayoutProp || location.pathname.startsWith("/customer");

  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filters from URL
  const query = searchParams.get("q") || "";
  const category = searchParams.get("category") || "";
  const city = searchParams.get("city") || "";
  const minRating = searchParams.get("minRating") || "";
  const sort = searchParams.get("sort") || "rating";
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Local filter form state
  const [keywordInput, setKeywordInput] = useState(query);
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [selectedCity, setSelectedCity] = useState(city);
  const [selectedMinRating, setSelectedMinRating] = useState(minRating);
  const [selectedSort, setSelectedSort] = useState(sort);

  // Load categories
  useEffect(() => {
    httpClient
      .get("/public/categories")
      .then((res) => {
        if (res.data?.success) setCategories(res.data.categories || []);
      })
      .catch((err) => console.error("Error fetching categories:", err));
  }, []);

  // Fetch search results when URL params change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    httpClient
      .get(`/public/search?${params.toString()}`)
      .then((res) => {
        if (res.data?.success) {
          setProviders(res.data.providers || []);
          setTotal(res.data.total || 0);
          setPages(res.data.pages || 1);
        }
      })
      .catch((err) => {
        console.error("Search error:", err);
        setProviders([]);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  const applyFilters = (newParams = {}) => {
    const updated = new URLSearchParams(searchParams);

    const merged = {
      q: keywordInput,
      category: selectedCategory,
      city: selectedCity,
      minRating: selectedMinRating,
      sort: selectedSort,
      page: "1",
      ...newParams,
    };

    Object.entries(merged).forEach(([key, val]) => {
      if (val && String(val).trim()) {
        updated.set(key, String(val).trim());
      } else {
        updated.delete(key);
      }
    });

    setSearchParams(updated);
    setMobileFilterOpen(false);
  };

  const handleReset = () => {
    setKeywordInput("");
    setSelectedCategory("");
    setSelectedCity("");
    setSelectedMinRating("");
    setSelectedSort("rating");
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    const updated = new URLSearchParams(searchParams);
    updated.set("page", String(newPage));
    setSearchParams(updated);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const FilterPanelContent = () => (
    <div className="space-y-6">
      {/* Category */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
          Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
          City / Area
        </label>
        <input
          type="text"
          placeholder="e.g. Lahore, Karachi..."
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#111111]"
        />
      </div>



      {/* Minimum Rating */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-2">
          Minimum Rating
        </label>
        <div className="flex gap-2 flex-wrap">
          {[4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedMinRating(selectedMinRating === String(r) ? "" : String(r))}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                selectedMinRating === String(r)
                  ? "bg-[#111111] text-white border-[#111111]"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {r}★ & above
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 border-t border-gray-100 flex gap-2">
        <button
          type="button"
          onClick={() => applyFilters()}
          className="btn-dark flex-1 justify-center py-2.5 text-xs font-bold"
        >
          Apply Filters
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );

  const searchContent = (
    <>
      {/* Search Bar & Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 mb-8">
          <div className="max-w-2xl mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Find Verified Professionals
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Browse top-rated home service experts in your area.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyFilters({ q: keywordInput });
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search services or providers (e.g. AC repair, electrician)..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#111111] focus:bg-white transition"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                className="btn-dark flex-1 sm:flex-none justify-center px-6 py-3"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-semibold hover:bg-gray-50 transition"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>
          </form>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                </div>
                {(query || category || city || minRating) && (
                  <button
                    onClick={handleReset}
                    className="text-xs text-rose-500 hover:underline font-semibold"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <FilterPanelContent />
            </div>
          </aside>

          {/* Search Results Area */}
          <section className="lg:col-span-3">
            {/* Results bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <p className="text-sm font-medium text-gray-500">
                Found <span className="font-bold text-ink">{total}</span> verified{" "}
                {total === 1 ? "provider" : "providers"}
              </p>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">Sort by:</span>
                <select
                  value={selectedSort}
                  onChange={(e) => {
                    setSelectedSort(e.target.value);
                    applyFilters({ sort: e.target.value });
                  }}
                  className="text-xs font-bold rounded-xl border border-gray-200 px-3 py-2 bg-white focus:outline-none"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="experience">Most Experienced</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="py-20">
                <Spinner size="lg" />
              </div>
            ) : providers.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No providers found"
                description="Try clearing some filters or searching with a different term."
                action={
                  <button onClick={handleReset} className="btn-dark text-xs px-5 py-2.5">
                    Clear Filters
                  </button>
                }
              />
            ) : (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {providers.map((p) => {
                  return (
                    <div
                      key={p._id}
                      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center min-h-[22rem]"
                    >
                      {/* Provider Avatar */}
                      <div className="shrink-0 mb-4">
                        {p.profilePhoto ? (
                          <img
                            src={p.profilePhoto}
                            alt={`${p.firstName} ${p.lastName}`}
                            className="w-24 h-24 rounded-2xl object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-2xl bg-pastel-mint flex items-center justify-center text-ink text-xl font-black">
                            {p.firstName?.[0]}
                            {p.lastName?.[0]}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 w-full flex flex-col items-center">
                        <h2 className="text-lg font-bold text-ink truncate max-w-full">
                          {p.firstName} {p.lastName}
                        </h2>
                        <span className="mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pastel-yellow text-ink uppercase tracking-wider">
                          {p.serviceCategory?.replace("-", " ") || "Home Service"}
                        </span>

                        <div className="mt-3 flex flex-col items-center gap-1.5 text-xs text-gray-500">
                          <StarRating rating={p.rating?.average || 5} reviewCount={p.rating?.count || 0} showValue size="sm" />
                          {(p.city || p.serviceArea) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {p.city || p.serviceArea}
                            </span>
                          )}
                          {p.experienceYears && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              {p.experienceYears} yrs experience
                            </span>
                          )}
                        </div>

                        {p.bio && (
                          <p className="mt-3 text-xs text-gray-600 line-clamp-2 break-words max-w-full">{p.bio}</p>
                        )}
                      </div>

                      {/* Book CTA */}
                      <Link
                        to={`/customer/providers/${p._id}`}
                        className="btn-dark text-xs px-4 py-2.5 mt-5 w-full flex items-center justify-center gap-1"
                      >
                        Book now <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  );
                })}
                </div>

                <div className="mt-6">
                  <Pagination page={page} pages={pages} onPageChange={handlePageChange} />
                </div>
              </div>
            )}
          </section>
        </div>
      </>
    );

  const mobileFilterDrawer = mobileFilterOpen && (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setMobileFilterOpen(false)}
      />
      <div className="relative ml-auto w-full max-w-xs bg-white h-full p-6 shadow-xl flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
            <h3 className="font-bold text-ink">Filter Providers</h3>
            <button
              onClick={() => setMobileFilterOpen(false)}
              className="p-1 rounded-xl text-gray-400 hover:text-ink"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <FilterPanelContent />
        </div>
      </div>
    </div>
  );

  if (insideCustomerLayout) {
    return (
      <CustomerLayout title="Browse Services">
        <div className="space-y-6">{searchContent}</div>
        {mobileFilterDrawer}
      </CustomerLayout>
    );
  }

  return (
    <div className="min-h-screen bg-soft flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        {searchContent}
      </main>
      {mobileFilterDrawer}
      <Footer />
    </div>
  );
}