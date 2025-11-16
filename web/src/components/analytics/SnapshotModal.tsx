// Snapshot Management Modal

'use client';

import { useState } from 'react';
import { Snapshot, SnapshotCreate } from '@/types/analytics';
import { buildApiUrl } from '@/utils/api';
import { formatDate } from '@/utils/export';

type SnapshotModalProps = {
  isOpen: boolean;
  onClose: () => void;
  snapshots: Snapshot[];
  onSnapshotCreated: () => void;
  onSnapshotDeleted: () => void;
  onSnapshotView: (snapshotId: string) => void;
};

export default function SnapshotModal({
  isOpen,
  onClose,
  snapshots,
  onSnapshotCreated,
  onSnapshotDeleted,
  onSnapshotView,
}: SnapshotModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [newSnapshotDesc, setNewSnapshotDesc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateSnapshot = async () => {
    if (!newSnapshotName.trim()) {
      setError('Please enter a snapshot name');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const token = localStorage.getItem('jwt_token');
      const snapshotData: SnapshotCreate = {
        name: newSnapshotName.trim(),
        description: newSnapshotDesc.trim() || undefined,
      };

      const res = await fetch(buildApiUrl('/analytics/snapshots'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(snapshotData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create snapshot');
      }

      setNewSnapshotName('');
      setNewSnapshotDesc('');
      onSnapshotCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create snapshot');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string) => {
    if (!confirm('Are you sure you want to delete this snapshot? This action cannot be undone.')) {
      return;
    }

    setDeletingId(snapshotId);
    setError(null);

    try {
      const token = localStorage.getItem('jwt_token');
      const res = await fetch(buildApiUrl(`/analytics/snapshots/${snapshotId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to delete snapshot');
      }

      onSnapshotDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete snapshot');
    } finally {
      setDeletingId(null);
    }
  };

  const maxSnapshots = 5;
  const canCreateMore = snapshots.length < maxSnapshots;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-default rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-default">
          <div>
            <h2 className="text-xl font-semibold">Analytics Snapshots</h2>
            <p className="text-sm text-muted mt-1">
              Save and compare analytics data over time ({snapshots.length}/{maxSnapshots} snapshots)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Create New Snapshot */}
          <div className="rounded-lg border border-default bg-gray-800 p-4">
            <h3 className="text-sm font-semibold mb-3">Create New Snapshot</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor="snapshot-name" className="block text-xs text-muted mb-1">
                  Snapshot Name *
                </label>
                <input
                  id="snapshot-name"
                  type="text"
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  placeholder="e.g., End of Month Review"
                  disabled={!canCreateMore || isCreating}
                  className="w-full px-3 py-2 rounded-md bg-gray-950 border border-default text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  maxLength={50}
                />
              </div>
              <div>
                <label htmlFor="snapshot-desc" className="block text-xs text-muted mb-1">
                  Description (optional)
                </label>
                <textarea
                  id="snapshot-desc"
                  value={newSnapshotDesc}
                  onChange={(e) => setNewSnapshotDesc(e.target.value)}
                  placeholder="Add notes about this snapshot..."
                  disabled={!canCreateMore || isCreating}
                  className="w-full px-3 py-2 rounded-md bg-gray-950 border border-default text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
                  rows={2}
                  maxLength={200}
                />
              </div>
              <button
                onClick={handleCreateSnapshot}
                disabled={!canCreateMore || isCreating || !newSnapshotName.trim()}
                className="w-full px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : canCreateMore ? 'Create Snapshot' : `Maximum ${maxSnapshots} snapshots reached`}
              </button>
            </div>
          </div>

          {/* Snapshots List */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Saved Snapshots</h3>
            {snapshots.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted">
                <p>No snapshots yet</p>
                <p className="text-xs mt-1">Create your first snapshot to save current analytics data</p>
              </div>
            ) : (
              <div className="space-y-3">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className="rounded-lg border border-default bg-gray-800 p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{snapshot.name}</h4>
                        {snapshot.description && (
                          <p className="text-sm text-muted mt-1 line-clamp-2">{snapshot.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          <span>{formatDate(snapshot.created_at)}</span>
                          <span>•</span>
                          <span>{snapshot.data_count} jobs</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onSnapshotView(snapshot.id)}
                          className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snapshot.id)}
                          disabled={deletingId === snapshot.id}
                          className="px-3 py-1.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {deletingId === snapshot.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-default">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-md bg-white/10 hover:bg-white/15 text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
