import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Users, Eye, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Admin Dashboard' };

interface DashboardStats {
  totalProperties: number;
  totalUsers: number;
  totalViews: number;
  totalRevenue: number;
  recentListings: RecentListing[];
}

interface RecentListing {
  id: string;
  title: string;
  city: string;
  price: number;
  type: 'sale' | 'rent';
  status: 'available' | 'sold' | 'rented';
  createdAt: string;
}

async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties/admin/stats`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error();
    return res.json();
  } catch {
    return {
      totalProperties: 0,
      totalUsers: 0,
      totalViews: 0,
      totalRevenue: 0,
      recentListings: [],
    };
  }
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  sold:      'bg-red-100   text-red-700',
  rented:    'bg-blue-100  text-blue-700',
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const STAT_CARDS = [
    { label: 'Total Properties', value: stats.totalProperties.toLocaleString(), icon: Building2, color: 'text-blue-500',   bg: 'bg-blue-50' },
    { label: 'Total Users',      value: stats.totalUsers.toLocaleString(),      icon: Users,     color: 'text-purple-500', bg: 'bg-purple-50' },
    { label: 'Total Views',      value: stats.totalViews.toLocaleString(),      icon: Eye,       color: 'text-green-500',  bg: 'bg-green-50' },
    { label: 'Revenue (MTD)',     value: `$${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Overview of platform activity</p>
          </div>
          <Link href="/admin/properties/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Property
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="bg-white rounded-2xl shadow-card p-6 flex items-center gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Listings Table */}
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Listings</h2>
            <Link href="/admin/properties" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Title', 'City', 'Price', 'Type', 'Status', 'Date', 'Actions'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentListings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-400">No listings yet</td>
                  </tr>
                ) : (
                  stats.recentListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 max-w-[200px] truncate">{listing.title}</td>
                      <td className="px-6 py-4 text-gray-500">{listing.city}</td>
                      <td className="px-6 py-4 font-semibold text-primary-600">${listing.price.toLocaleString()}</td>
                      <td className="px-6 py-4 capitalize text-gray-500">{listing.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[listing.status]}`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{new Date(listing.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <Link href={`/admin/properties/${listing.id}`} className="text-primary-600 hover:underline mr-3">Edit</Link>
                        <button className="text-red-500 hover:underline">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
