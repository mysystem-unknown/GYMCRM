'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI, formatCurrency, formatDate, getStatusColor } from '@/lib/api';
import { exportToCSV } from '@/lib/export';
import type { Member } from '@/types/gym';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Search, Plus, Download, Eye, RefreshCw, Pencil, Trash2,
  ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 15;
const plans = ['1 Month', '3 Months', '6 Months', '1 Year'];

export function MembersView() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const activeGymId = useGymStore((s) => s.activeGymId);
  const user = useGymStore((s) => s.user);
  const setSelectedMember = useGymStore((s) => s.setSelectedMember);
  const setShowRenewalModal = useGymStore((s) => s.setShowRenewalModal);
  const setShowAddMemberModal = useGymStore((s) => s.setShowAddMemberModal);
  const setShowEditMemberModal = useGymStore((s) => s.setShowEditMemberModal);

  const canManage = user?.role === 'admin' || user?.role === 'super_admin';
  const canRenew = canManage || user?.canRenewMemberships === true;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (planFilter !== 'all') params.set('plan', planFilter);
      params.set('page', String(page));
      params.set('limit', String(ITEMS_PER_PAGE));
      const result = await fetchAPI<{ members: Member[]; total: number }>(`/api/members?${params}`);
      setMembers(result.members);
      setTotal(result.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, planFilter, page, activeGymId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete member "${name}"? This cannot be undone.`)) return;
    try {
      await fetchAPI(`/api/members?id=${id}`, { method: 'DELETE' });
      toast.success(`Member "${name}" deleted`);
      loadMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete member');
    }
  };

  const handleRenew = (member: Member) => {
    setSelectedMember(member);
    setShowRenewalModal(true);
  };

  const handleView = (member: Member) => {
    setSelectedMember(member);
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setShowEditMemberModal(true);
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting CSV...');
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      params.set('limit', '1000');
      const result = await fetchAPI<{ members: Member[] }>(`/api/members?${params}`);
      const data = result.members;
      if (data.length === 0) {
        toast.error('No members to export');
        return;
      }
      const exportData = data.map(m => ({
        'Member ID': m.memberId, 'Name': m.name, 'Phone': m.phoneNumber,
        'Join Date': formatDate(m.joinDate), 'Expiry Date': formatDate(m.expiryDate),
        'Plan': m.membershipPlan, 'Cash': m.currentCashPayment, 'UPI': m.currentUpiPayment,
        'Total': m.totalPayment, 'Pending': m.pendingPayment, 'Status': m.status,
      }));
      exportToCSV(exportData, 'gym-members.csv');
      toast.success(`${data.length} members exported`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to export CSV');
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-muted-foreground">{total} total members</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          )}
          {canManage && (
            <Button size="sm" onClick={() => setShowAddMemberModal(true)} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table - Desktop */}
      <Card className="border-0 shadow-sm hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[120px]">Phone</TableHead>
                <TableHead className="w-[100px]">Expiry</TableHead>
                <TableHead className="w-[90px]">Plan</TableHead>
                <TableHead className="text-right w-[70px]">Cash</TableHead>
                <TableHead className="text-right w-[70px]">UPI</TableHead>
                <TableHead className="text-right w-[80px]">Total</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No members found
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id} className="group">
                    <TableCell className="font-mono text-xs text-muted-foreground">{member.memberId}</TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{member.phoneNumber}</TableCell>
                    <TableCell className="text-sm">{formatDate(member.expiryDate)}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{member.membershipPlan}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{member.currentCashPayment > 0 ? formatCurrency(member.currentCashPayment) : '-'}</TableCell>
                    <TableCell className="text-right text-sm">{member.currentUpiPayment > 0 ? formatCurrency(member.currentUpiPayment) : '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatCurrency(member.totalPayment)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(member)} title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        {canRenew && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRenew(member)} title="Renew">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(member)} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {canManage && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(member.id, member.name)} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Members Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : members.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No members found</Card>
        ) : (
          members.map((member) => (
            <Card key={member.id} className="border-0 shadow-sm p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{member.memberId}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                      {member.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.phoneNumber}</p>
                </div>
                <Badge variant="secondary">{member.membershipPlan}</Badge>
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <span>Expires: {formatDate(member.expiryDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-sm">
                  <span className="text-muted-foreground">Cash: {formatCurrency(member.totalCash)}</span>
                  <span className="text-muted-foreground">UPI: {formatCurrency(member.totalUpi)}</span>
                </div>
                <div className="flex gap-1">
                  {canRenew && (
                    <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => handleRenew(member)}>
                      <RefreshCw className="w-3 h-3" /> Renew
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => handleView(member)}>
                    <Eye className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} ({total} members)
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
