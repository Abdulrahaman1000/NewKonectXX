/**
 * To get: pre-order pieces that are paid. Buy the goods, then press "Got it":
 * the order (or the waiting part of it) moves to Fulfilment > To pack.
 * The same list is also the "To get" tab inside Fulfilment.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { SEO } from '@/components/shared/SEO';
import { AdminFrame } from '@/components/admin/AdminFrame';
import { ToGetPanel } from '@/components/ToGetPanel';

export default function AdminToGet() {
  return (
    <AdminFrame>
      <SEO title="To get" />
      <Link to="/admin" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 mb-5">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to dashboard
      </Link>
      <h1 className="text-2xl md:text-3xl font-black text-white mb-1">To get</h1>
      <ToGetPanel />
    </AdminFrame>
  );
}
