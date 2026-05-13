'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGymStore } from '@/store/gym-store';
import { fetchAPI, formatCurrency, formatDate, getStatusColor } from '@/lib/api';
import type { Member } from '@/types/gym';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, User, Phone, Calendar, CreditCard } from 'lucide-react';

export function SearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const activeGymId = useGymStore((s) => s.activeGymId);
  const setSelectedMember = useGymStore((s) => s.setSelectedMember);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSearched(true);
    try {
      const params = new URLSearchParams();
      if (activeGymId) params.set('gymId', activeGymId);
      params.set('search', encodeURIComponent(query.trim()));
      params.set('limit', '50');
      const result = await fetchAPI<{ members: Member[] }>(`/api/members?${params}`);
      setResults(result.members);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [query, activeGymId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 1) {
        handleSearch();
      } else {
        setResults([]);
        setSearched(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, handleSearch]);

  const handleSelect = (member: Member) => {
    setSelectedMember(member);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Search Members</h1>
        <p className="text-sm text-muted-foreground">Search by name, phone number, or member ID</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type to search..."
          className="pl-12 h-14 text-lg rounded-xl border-2 focus:border-emerald-500 transition-colors"
          autoFocus
        />
      </div>

      {/* Results */}
      {searching && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      )}

      {!searching && searched && results.length === 0 && (
        <Card className="border-0 shadow-sm p-8 text-center">
          <p className="text-muted-foreground">No members found for &quot;{query}&quot;</p>
        </Card>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{results.length} member{results.length !== 1 ? 's' : ''} found</p>
          {results.map((member) => (
            <Card
              key={member.id}
              className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-emerald-200 dark:hover:border-emerald-800"
              onClick={() => handleSelect(member)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
                        {member.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {member.memberId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {member.phoneNumber}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Exp: {formatDate(member.expiryDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3" /> {member.membershipPlan}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(member.totalPayment)}</p>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
