import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CreditCard,
  Droplets,
  Hammer,
  Paintbrush,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
  MapPin,
} from "lucide-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import StarRating from "../../components/common/StarRating";
import { httpClient } from "../../lib/http";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || "support@fixpoint.com";

const CATEGORY_ICONS = {
  "home-cleaner": Sparkles,
  electrician: Zap,
  plumber: Droplets,
  carpenter: Hammer,
  painter: Paintbrush,
};

const ICON_BG = [
  "bg-pastel-yellow",
  "bg-pastel-pink",
  "bg-pastel-blue",
  "bg-pastel-peach",
  "bg-pastel-teal",
  "bg-pastel-lime",
];

const STEPS = [
  {
    no: "01",
    title: "Find a service",
    text: "Search or browse categories and pick the professional that fits your need.",
    bg: "bg-pastel-yellow",
  },
  {
    no: "02",
    title: "Pick date and time",
    text: "See real available slots and choose the one that suits your schedule.",
    bg: "bg-pastel-peach",
  },
  {
    no: "03",
    title: "Confirm booking",
    text: "Enter your service address and confirm without upfront card charges.",
    bg: "bg-pastel-mint",
  },
  {
    no: "04",
    title: "Get it done",
    text: "Your verified provider arrives on time. Pay upon completion and leave a review.",
    bg: "bg-pastel-blue",
  },
];

const REASONS = [
  "Every provider is verified by our team before going live",
  "Clear prices shown upfront, no hidden costs",
  "Transparent and direct payments upon service completion",
  "Reschedule or cancel from your dashboard",
  "Reviews only from customers with completed bookings",
];

const PROVIDER_POINTS = [
  { title: "Get verified", text: "Submit your profile and documents. We review them quickly." },
  { title: "Set your own terms", text: "Choose your services, prices, working days and hours." },
  { title: "Direct earnings", text: "Get paid directly by customers upon job completion." },
];

const FAQS = [
  {
    q: "How are providers verified?",
    a: "Every provider submits their profile, CNIC and certificates. Our admin team reviews them and only approved providers appear on FixPoint.",
  },
  {
    q: "Which services can I book?",
    a: "You can book home cleaners, electricians, plumbers, carpenters and painters. More categories are added over time.",
  },
  {
    q: "How do I pay?",
    a: "You pay directly to the provider upon completion of the service in cash or instant transfer.",
  },
  {
    q: "Can I reschedule or cancel a booking?",
    a: "Yes. You can reschedule or cancel from your dashboard up to 12 hours before the scheduled appointment.",
  },
  {
    q: "Can I leave a review?",
    a: "Yes. After your booking is marked completed, you can rate the provider from 1 to 5 stars and write a review.",
  },
  {
    q: "I am a professional. How do I join?",
    a: "Use the Become a Provider section below to contact us. After approval you will receive your login details by email.",
  },
];

function PhotoSlot({ src, alt, className = "", children }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {failed ? (
        <div className="flex h-full w-full items-center justify-center bg-pastel-mint">
          <Wrench className="h-16 w-16 text-ink/20" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
      {children}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState([]);
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [latestReviews, setLatestReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    Promise.all([
      httpClient.get("/public/categories").then((res) => setCategories(res.data.categories || [])),
      httpClient.get("/public/featured").then((res) => setFeaturedProviders(res.data.providers || [])).catch(() => []),
      httpClient.get("/public/reviews/latest").then((res) => setLatestReviews(res.data.reviews || [])).catch(() => []),
    ])
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q),
    );
  }, [categories, query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    } else {
      navigate("/search");
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* ================= HERO ================= */}
      <section className="page-gradient pb-16 sm:pb-24" id="top">
        <Navbar />

        <div className="mx-auto mt-10 grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:mt-16 lg:grid-cols-2 lg:px-8">
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Reliable home services, right at your doorstep
            </h1>
            <p className="mt-5 max-w-lg text-slate-600">
              From cleaning and repairs to expert maintenance. Book trusted,
              verified professionals with transparent upfront pricing.
            </p>

            <form
              onSubmit={handleSearch}
              className="mt-8 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-sm border border-gray-100"
            >
              <Search className="ml-4 h-5 w-5 shrink-0 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for a service or provider..."
                className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm outline-none placeholder:text-slate-400"
              />
              <button type="submit" className="btn-dark">
                Search
              </button>
            </form>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
              {["Verified professionals", "Transparent pricing", "Easy scheduling"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="h-4 w-4" /> {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="rounded-[2.5rem] bg-white p-3 shadow-sm">
              <PhotoSlot
                src="/images/hero.jpg"
                alt="FixPoint professionals"
                className="aspect-[4/5] rounded-[2rem]"
              />
            </div>

            <div className="absolute left-2 top-10 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-lg sm:-left-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-mint">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">Verified professionals</p>
                <p className="text-xs text-slate-500">Checked by our team</p>
              </div>
            </div>

            <div className="absolute bottom-10 right-2 flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-lg sm:-right-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pastel-blue">
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold">Transparent pricing</p>
                <p className="text-xs text-slate-500">Pay on completion</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section id="services" className="bg-soft py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <h2 className="section-title">Services for every corner of your home</h2>
            <p className="text-slate-600 lg:max-w-md lg:justify-self-end">
              Pick a category to find verified professionals near you.
            </p>
          </div>

          {error && (
            <p className="mt-10 rounded-2xl bg-white p-6 text-sm text-slate-600">
              Could not load services right now. Please try again in a moment.
            </p>
          )}

          {loading && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-60 animate-pulse rounded-3xl bg-white" />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="mt-10 rounded-2xl bg-white p-6 text-sm text-slate-600">
              {query
                ? `No service matches "${query}".`
                : "No services are available yet."}{" "}
              {query && (
                <button onClick={() => setQuery("")} className="font-semibold underline">
                  Clear search
                </button>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((category, index) => {
                const Icon = CATEGORY_ICONS[category.slug] || Wrench;

                return (
                  <div
                    key={category._id || category.slug}
                    className="group flex flex-col items-center rounded-3xl bg-white p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition"
                  >
                    <span
                      className={`flex h-14 w-14 items-center justify-center rounded-full ${
                        ICON_BG[index % ICON_BG.length]
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>

                    <h3 className="mt-5 text-lg font-bold">{category.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-xs text-slate-500">
                      {category.description || "Book trusted professionals for this service."}
                    </p>

                    <Link
                      to={`/search?category=${category.slug}`}
                      className="mt-6 w-full rounded-full bg-soft py-3 text-sm font-semibold transition group-hover:bg-ink group-hover:text-white"
                    >
                      Browse Providers
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ================= FEATURED PROVIDERS (REAL DATA) ================= */}
      {featuredProviders.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Top Rated
                </span>
                <h2 className="section-title mt-1">Featured Verified Providers</h2>
              </div>
              <Link to="/search" className="btn-dark text-xs px-5 py-2.5">
                View all providers <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProviders.map((p) => (
                <div
                  key={p._id}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="flex items-start gap-4">
                    {p.profilePhoto ? (
                      <img
                        src={p.profilePhoto}
                        alt={p.firstName}
                        className="w-16 h-16 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-pastel-mint flex items-center justify-center font-bold text-ink text-lg">
                        {p.firstName?.[0]}
                        {p.lastName?.[0]}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-ink truncate">
                        {p.firstName} {p.lastName}
                      </h3>
                      <span className="text-xs text-gray-500 capitalize block">
                        {p.serviceCategory?.replace("-", " ")}
                      </span>
                      <div className="mt-1">
                        <StarRating
                          rating={p.rating?.average || 5}
                          reviewCount={p.rating?.count || 0}
                          size="sm"
                          showValue
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {p.city || "Verified"}
                    </span>
                    <Link
                      to={`/providers/${p._id}`}
                      className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                    >
                      Profile <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= HOW IT WORKS ================= */}
      <section id="how-it-works" className="bg-soft py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-2 lg:items-end">
            <h2 className="section-title">How FixPoint works</h2>
            <p className="text-slate-600 lg:max-w-md lg:justify-self-end">
              Booking a home service takes a few minutes, from search to completion.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => (
              <div
                key={step.no}
                className={`flex min-h-64 flex-col justify-between rounded-3xl p-6 ${step.bg}`}
              >
                <div>
                  <p className="text-5xl font-bold tracking-tight">{step.no}</p>
                  <p className="mt-2 text-sm font-semibold">{step.title}</p>
                </div>
                <p className="text-sm text-ink/80">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= RECENT CUSTOMER TESTIMONIALS (REAL DATA) ================= */}
      {latestReviews.length > 0 && (
        <section className="bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Testimonials
              </span>
              <h2 className="section-title mt-1">What customers are saying</h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestReviews.map((rev) => (
                <div
                  key={rev._id}
                  className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <StarRating rating={rev.rating} size="sm" />
                    <p className="text-xs text-gray-700 leading-relaxed italic">
                      "{rev.comment}"
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-200/60 flex items-center justify-between text-xs text-gray-500">
                    <span className="font-bold text-ink">{rev.customerName}</span>
                    <span className="text-[10px]">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ================= WHY FIXPOINT ================= */}
      <section className="bg-white pb-16 sm:pb-24">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <PhotoSlot
            src="/images/why.jpg"
            alt="Home service in progress"
            className="min-h-72 rounded-[2rem]"
          />

          <div className="rounded-[2rem] bg-pastel-mint p-8 sm:p-10">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              The reasons people count on us
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              We are more than a listing site. We make sure every booking is safe
              and simple.
            </p>

            <ul className="mt-8 space-y-3">
              {REASONS.map((reason) => (
                <li key={reason} className="flex items-start gap-3 text-sm font-medium">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white">
                    <Check className="h-3 w-3" />
                  </span>
                  {reason}
                </li>
              ))}
            </ul>

            <Link to="/register" className="btn-dark mt-8">
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ================= BECOME A PROVIDER ================= */}
      <section id="provider" className="bg-white pb-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[2rem] bg-pastel-yellow p-8 sm:p-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-block rounded-full bg-white px-4 py-1.5 text-xs font-bold">
                For professionals
              </span>
              <h2 className="section-title mt-4">Become a Provider</h2>
              <p className="mt-4 max-w-md text-slate-700">
                Interested in offering your services on FixPoint? Apply by sending us an email with your name, service category, city and experience. Our team will review your request and contact you.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a
                  href="mailto:fixponit954@gmail.com?subject=Provider%20Application"
                  className="btn-dark"
                >
                  Apply via email
                </a>
                <a
                  href="mailto:fixponit954@gmail.com?subject=Provider%20Application"
                  className="text-sm font-semibold text-ink underline decoration-slate-300 hover:text-slate-600"
                >
                  fixponit954@gmail.com
                </a>
              </div>
            </div>

            <div className="space-y-3">
              {PROVIDER_POINTS.map((point, index) => (
                <div key={point.title} className="flex items-start gap-4 rounded-2xl bg-white p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold">{point.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{point.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section id="faq" className="bg-soft py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="section-title">Frequently asked questions</h2>
            <p className="mt-4 max-w-sm text-slate-600">
              Can't find your answer? Write to us at {SUPPORT_EMAIL}.
            </p>
          </div>

          <div className="space-y-3">
            {FAQS.map((item, index) => {
              const isOpen = openFaq === index;

              return (
                <div key={item.q} className="rounded-2xl bg-white">
                  <button
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-bold sm:text-base"
                  >
                    {item.q}
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && <p className="px-5 pb-5 text-sm text-slate-600">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="page-gradient rounded-[2rem] px-6 py-16 text-center sm:py-20">
            <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">
              Need help today? We're just a click away.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-600">
              Book a trusted professional in minutes. Fast, safe and simple.
            </p>
            <Link to="/search" className="btn-dark mt-8">
              Explore all services
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
