import { Link } from "react-router-dom";
import { ArrowRight, Globe, ExternalLink } from "lucide-react";

interface Project {
  slug: string;
  name: string;
  industry: string;
  city: string;
  description: string;
  tags: string[];
  primaryColor: string;
  accentColor: string;
  initials: string;
}

const PROJECTS: Project[] = [
  {
    slug: "rivera-tree-experts",
    name: "Rivera Tree Experts",
    industry: "Tree Service",
    city: "Houston, TX",
    description: "Family-owned tree service with 24/7 emergency response, stump grinding, and lot clearing.",
    tags: ["Local Business", "Service", "Emergency"],
    primaryColor: "#0d2e1a",
    accentColor: "#f97316",
    initials: "RTE",
  },
  {
    slug: "lopez-painting-drywall",
    name: "López Painting & Drywall",
    industry: "Painting Contractor",
    city: "Orlando, FL",
    description: "Interior & exterior painting, drywall repair, and cabinet refinishing. Book estimates via an interactive calendar.",
    tags: ["Local Business", "Home Service", "Calendar"],
    primaryColor: "#1a3c5e",
    accentColor: "#c41e3a",
    initials: "LPD",
  },
  {
    slug: "el-sol-roofing",
    name: "El Sol Roofing",
    industry: "Roofing Contractor",
    city: "Phoenix, AZ",
    description: "Multi-page roofing website with gallery, Phoenix service area map, 5-page navigation, and full CRO optimization.",
    tags: ["Multi-Page", "Gallery", "Dark Theme"],
    primaryColor: "#0A0A0A",
    accentColor: "#B91C1C",
    initials: "ESR",
  },
  {
    slug: "bella-shine-cleaning",
    name: "Bella Shine Cleaning",
    industry: "Residential & Commercial Cleaning",
    city: "Dallas, TX",
    description: "Family cleaning service with floating pill nav, circular hero, organic blob design, and a 5-step booking calendar.",
    tags: ["Booking Calendar", "Eco-Friendly", "Light Theme"],
    primaryColor: "#0891B2",
    accentColor: "#10B981",
    initials: "BSC",
  },
  {
    slug: "luna-beauty-studio",
    name: "Luna Beauty Studio",
    industry: "Beauty Salon & Makeup",
    city: "Miami, FL",
    description: "Multi-page luxury beauty salon with smart booking calendar that filters by service + specialist. 5 pages, team profiles, gallery, and CRO-optimized.",
    tags: ["Multi-Page", "Smart Calendar", "Luxury"],
    primaryColor: "#1C1917",
    accentColor: "#BE185D",
    initials: "LBS",
  },
  {
    slug: "sun-aired-bag",
    name: "Sun Aired Bag Co.",
    industry: "Industrial Bag Systems Manufacturer",
    city: "Redondo Beach, CA",
    description: "B2B single-page proposal for a checking bag manufacturer serving public pools, correctional facilities, and film productions since 1947.",
    tags: ["B2B", "Single Page", "Industrial"],
    primaryColor: "#0B1D3A",
    accentColor: "#0EA5E9",
    initials: "SAB",
  },
  {
    slug: "gonzales",
    name: "Gonzalez Herriquez Landscaping",
    industry: "Landscaping & Tree Services",
    city: "Punta Gorda, FL",
    description: "Professional landscaping and tree service company serving Punta Gorda & Port Charlotte, FL. Emergency response, work guarantee, and free on-site estimates.",
    tags: ["Local Business", "Tree Service", "Florida"],
    primaryColor: "#162018",
    accentColor: "#B86A30",
    initials: "GHL",
  },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      to={`/websites/${project.slug}`}
      className="group rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-400 bg-white hover:shadow-xl transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Thumbnail preview */}
      <div
        className="aspect-video relative overflow-hidden"
        style={{ backgroundColor: project.primaryColor }}
      >
        {/* Simulated page layout */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between">
          {/* Fake navbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded" style={{ backgroundColor: project.accentColor }} />
              <div className="w-16 h-2 bg-white/30 rounded-full" />
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-8 h-2 bg-white/20 rounded-full" />
              <div className="w-8 h-2 bg-white/20 rounded-full" />
              <div className="w-14 h-5 rounded-md" style={{ backgroundColor: project.accentColor }} />
            </div>
          </div>

          {/* Fake hero content */}
          <div className="pb-2">
            <div className="w-3/4 h-4 bg-white/40 rounded-full mb-2" />
            <div className="w-1/2 h-3 rounded-full" style={{ backgroundColor: project.accentColor, opacity: 0.75 }} />
            <div className="flex gap-2 mt-3">
              <div className="w-20 h-5 rounded-md" style={{ backgroundColor: project.accentColor }} />
              <div className="w-16 h-5 rounded-md border border-white/30" />
            </div>
          </div>
        </div>

        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: project.accentColor }} />

        {/* Hover overlay with CTA */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0 bg-white text-gray-900 font-bold text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg">
            <ExternalLink size={14} />
            Ver sitio
          </div>
        </div>
      </div>

      {/* Card info */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div>
            <h3 className="text-gray-900 font-bold text-base leading-snug">{project.name}</h3>
            <div className="text-gray-400 text-xs mt-0.5">
              {project.industry} · {project.city}
            </div>
          </div>
          <div className="shrink-0 w-8 h-8 bg-gray-100 group-hover:bg-gray-900 rounded-full flex items-center justify-center transition-all duration-200">
            <ArrowRight size={14} className="text-gray-400 group-hover:text-white transition-colors duration-200" />
          </div>
        </div>

        <p className="text-gray-500 text-sm leading-relaxed flex-1">{project.description}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-2.5 py-1 bg-gray-100 group-hover:bg-gray-200 rounded-full text-gray-500 font-medium transition-colors duration-200"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

export default function WebsitesCatalog() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
              <Globe size={16} className="text-white" />
            </div>
            <div>
              <div className="text-gray-400 text-[10px] tracking-widest uppercase font-medium">Acrosoft Labs</div>
              <h1 className="text-gray-900 font-bold text-lg leading-tight">Website Portfolio</h1>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            {PROJECTS.length} project{PROJECTS.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROJECTS.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}

          {/* Coming soon placeholder */}
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4">
              <Globe size={20} className="text-gray-300" />
            </div>
            <div className="text-gray-400 font-semibold text-sm">More coming soon</div>
            <div className="text-gray-300 text-xs mt-1">New websites added regularly</div>
          </div>
        </div>
      </div>
    </div>
  );
}
