"use client";

import { useEffect, useState } from "react";
import {
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
  Copy,
  Check,
  Eye,
  HardDrive,
  Folder,
  LayoutGrid,
  List,
  Lock,
  Globe,
  Plus,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { fetchDataFromAPI } from "@/lib/api";
import constants, { getUser } from "@/lib/constants";
import moment from "moment";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import toast from "react-hot-toast";

export function BucketList() {
  const user = JSON.parse(getUser() || 'null');
  const navigate = useNavigate();

  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Edit Bucket Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | number | null>(null);
  const [bucketName, setBucketName] = useState("");

  // Share Modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharingBucket, setSharingBucket] = useState<any | null>(null);
  const [sharePassword, setSharePassword] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const logout = () => {
    localStorage.removeItem(constants.USER);
    navigate("/");
    window.location.reload();
  };

  const loadBuckets = () => {
    setLoading(true);
    fetchDataFromAPI<any>("user/dashboard", "get", "", user)
      .then((res) => {
        setBuckets(res?.data?.bucket || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error loading buckets:", error);
        setLoading(false);
        if (error?.status === 401) {
          logout();
        }
      });
  };

  useEffect(() => {
    loadBuckets();
  }, []);

  const handleOpenBucket = (id: string | number) => {
    navigate(`/mybucket/${id}`);
  };

  const handleEditBucket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim() || !editingBucketId) return;

    setLoading(true);
    fetchDataFromAPI(`bucket/edit/${editingBucketId}`, "post", { name: bucketName.trim() }, user)
      .then((res: any) => {
        toast.success(res?.message || "Bucket renamed successfully");
        setIsEditModalOpen(false);
        setEditingBucketId(null);
        setBucketName("");
        loadBuckets();
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to rename bucket");
        setLoading(false);
      });
  };

  const handleDeleteBucket = (id: string | number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? All files stored in this Telegram channel will be deleted.`)) {
      return;
    }

    setLoading(true);
    fetchDataFromAPI(`bucket/delete/${id}`, "post", "", user)
      .then((res: any) => {
        toast.success(res?.message || "Bucket deleted successfully");
        loadBuckets();
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to delete bucket");
        setLoading(false);
      });
  };

  const handleSaveShare = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharingBucket) return;

    setLoading(true);
    const body: any = { bucket_id: sharingBucket.id };
    if (sharePassword.trim()) {
      body.password = sharePassword.trim();
    }

    fetchDataFromAPI("bucket/share", "post", body, user)
      .then((res: any) => {
        toast.success(res?.message || "Bucket shared successfully");
        setIsShareModalOpen(false);
        setSharingBucket(null);
        setSharePassword("");
        loadBuckets();
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to share bucket");
        setLoading(false);
      });
  };

  const handleRevokeShare = (code: string) => {
    if (!code) return;
    setLoading(true);
    fetchDataFromAPI(`bucket/end-share/${code}`, "post", "", user)
      .then((res: any) => {
        toast.success(res?.message || "Bucket sharing revoked");
        setIsShareModalOpen(false);
        setSharingBucket(null);
        loadBuckets();
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Failed to revoke share");
        setLoading(false);
      });
  };

  const copyShareUrl = (code: string) => {
    if (!code) return;
    const url = `${window.location.origin}/bucket/${code}`;
    navigator.clipboard.writeText(url);
    setCopiedCode(code);
    toast.success("Share URL copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* BoxBox Toolbar for Drives */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Drives / Mounts ({buckets.length})
          </span>
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Drive Cards Grid">
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-xs'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title="Drive List">
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty State */}
      {!loading && buckets.length === 0 && (
        <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <HardDrive className="w-10 h-10 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No buckets found</p>
          <p className="text-xs text-slate-500 mb-3">Create your first Telegram-backed storage bucket above.</p>
        </div>
      )}

      {/* BOXBOX DRIVE CARDS (GRID VIEW) */}
      {viewMode === 'grid' && buckets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {buckets.map((bucket) => {
            const shareCode = bucket?.code || bucket?.share?.code || null;
            const isShared = Boolean(shareCode);

            return (
              <div
                key={bucket.id}
                onClick={() => handleOpenBucket(bucket.id)}
                className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-lg transition-all duration-150 cursor-pointer">
                {/* Top Section */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/60 shrink-0 group-hover:scale-105 transition-transform">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate" title={bucket.bucketName}>
                        {bucket.bucketName}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          {moment(bucket.createdAt || bucket.created_at).format("MMM D, YYYY")}
                        </span>
                        {isShared && (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Shared
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Kebab Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="text-xs">
                      <DropdownMenuItem onClick={() => handleOpenBucket(bucket.id)} className="gap-2">
                        <Eye className="w-3.5 h-3.5 text-blue-500" /> Open Drive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setSharingBucket(bucket);
                          setIsShareModalOpen(true);
                        }}
                        className="gap-2">
                        <Share2 className="w-3.5 h-3.5 text-purple-500" /> Share Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingBucketId(bucket.id);
                          setBucketName(bucket.bucketName);
                          setIsEditModalOpen(true);
                        }}
                        className="gap-2">
                        <Edit2 className="w-3.5 h-3.5 text-amber-500" /> Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBucket(bucket.id, bucket.bucketName);
                        }}
                        className="gap-2 text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" /> Delete Drive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Footer Progress & Status */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-amber-500" /> Telegram Storage
                  </span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                    Browse →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* BOXBOX DRIVE TABLE (LIST VIEW) */}
      {viewMode === 'list' && buckets.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3 font-semibold">Drive Name</th>
                <th className="p-3 font-semibold w-32">Created</th>
                <th className="p-3 font-semibold w-24">Status</th>
                <th className="p-3 font-semibold w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {buckets.map((bucket) => {
                const shareCode = bucket?.code || bucket?.share?.code || null;
                const isShared = Boolean(shareCode);

                return (
                  <tr
                    key={bucket.id}
                    onClick={() => handleOpenBucket(bucket.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                    <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <HardDrive className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate">{bucket.bucketName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500">
                      {moment(bucket.createdAt || bucket.created_at).format("DD/MM/YYYY")}
                    </td>
                    <td className="p-3">
                      {isShared ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Shared
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800">
                          Private
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSharingBucket(bucket);
                            setIsShareModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-purple-600 rounded"
                          title="Share Link">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingBucketId(bucket.id);
                            setBucketName(bucket.bucketName);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-amber-600 rounded"
                          title="Rename">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBucket(bucket.id, bucket.bucketName)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Bucket Modal */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsEditModalOpen(false);
          }}>
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white">Rename Drive</h3>
            <form onSubmit={handleEditBucket} className="space-y-4">
              <Input
                type="text"
                placeholder="New bucket name"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="text-xs h-9"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-xs">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Bucket Modal */}
      {isShareModalOpen && sharingBucket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsShareModalOpen(false);
          }}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Share {sharingBucket.bucketName}
                </h3>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {sharingBucket.code ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-xs">
                  <span className="font-semibold text-purple-900 dark:text-purple-300 block mb-1">
                    Public Share URL
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/bucket/${sharingBucket.code}`}
                      className="flex-1 bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded px-2 py-1 text-xs font-mono"
                    />
                    <Button
                      size="sm"
                      onClick={() => copyShareUrl(sharingBucket.code)}
                      className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1">
                      {copiedCode === sharingBucket.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-500">Revoke public access?</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevokeShare(sharingBucket.code)}
                    disabled={loading}
                    className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50">
                    Stop Sharing
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveShare} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Generate a share link so anyone can view and stream files from this Telegram channel.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Password (Optional)
                  </label>
                  <Input
                    type="password"
                    placeholder="Leave blank for public link"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsShareModalOpen(false)}
                    className="text-xs">
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs">
                    Generate Link
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
