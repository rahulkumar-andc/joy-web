import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useState } from 'react';
import { Loader2, Plus, Trash2, Edit } from 'lucide-react';

interface FeatureFlag {
    id: number;
    name: string;
    description: string | null;
    enabled: boolean;
    rolloutPercentage: number;
    userIds: number[] | null;
    userRoles: string[] | null;
    createdAt: string;
    updatedAt: string;
}

export default function FeatureFlagsPage() {
    const queryClient = useQueryClient();
    const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const { data: flags = [], isLoading } = useQuery({
        queryKey: ['/api/admin/feature-flags'],
        queryFn: async () => {
            const res = await apiRequest('GET', '/api/admin/feature-flags');
            return res.json() as Promise<FeatureFlag[]>;
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: Partial<FeatureFlag> }) => {
            await apiRequest('PUT', `/api/admin/feature-flags/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/feature-flags'] });
            setEditingFlag(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest('DELETE', `/api/admin/feature-flags/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/feature-flags'] });
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<FeatureFlag>) => {
            await apiRequest('POST', '/api/admin/feature-flags', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/admin/feature-flags'] });
            setShowCreateForm(false);
        },
    });

    const toggleFlag = (flag: FeatureFlag) => {
        updateMutation.mutate({
            id: flag.id,
            data: { enabled: !flag.enabled },
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Feature Flags</h1>
                    <p className="text-muted-foreground mt-1">
                        Control features dynamically without deployments
                    </p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    New Flag
                </button>
            </div>

            <div className="space-y-4">
                {flags.map((flag) => (
                    <div
                        key={flag.id}
                        className="border rounded-lg p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-semibold">{flag.name}</h3>
                                    <span
                                        className={`px-2 py-1 text-xs font-medium rounded-full ${flag.enabled
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {flag.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>

                                {flag.description && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                        {flag.description}
                                    </p>
                                )}

                                <div className="flex gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Rollout:</span>
                                        <span className="ml-2 font-medium">{flag.rolloutPercentage}%</span>
                                    </div>
                                    {flag.userRoles && flag.userRoles.length > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">Roles:</span>
                                            <span className="ml-2 font-medium">
                                                {flag.userRoles.join(', ')}
                                            </span>
                                        </div>
                                    )}
                                    {flag.userIds && flag.userIds.length > 0 && (
                                        <div>
                                            <span className="text-muted-foreground">User IDs:</span>
                                            <span className="ml-2 font-medium">
                                                {flag.userIds.length} users
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => toggleFlag(flag)}
                                    disabled={updateMutation.isPending}
                                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${flag.enabled
                                            ? 'bg-green-500 text-white hover:bg-green-600'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    {flag.enabled ? 'Enabled' : 'Disabled'}
                                </button>

                                <button
                                    onClick={() => setEditingFlag(flag)}
                                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Edit className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={() => {
                                        if (confirm(`Delete flag "${flag.name}"?`)) {
                                            deleteMutation.mutate(flag.id);
                                        }
                                    }}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {editingFlag?.id === flag.id && (
                            <div className="mt-4 pt-4 border-t">
                                <EditFlagForm
                                    flag={editingFlag}
                                    onSave={(data) => {
                                        updateMutation.mutate({ id: flag.id, data });
                                    }}
                                    onCancel={() => setEditingFlag(null)}
                                    isPending={updateMutation.isPending}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showCreateForm && (
                <CreateFlagModal
                    onSave={(data) => createMutation.mutate(data)}
                    onCancel={() => setShowCreateForm(false)}
                    isPending={createMutation.isPending}
                />
            )}
        </div>
    );
}

function EditFlagForm({
    flag,
    onSave,
    onCancel,
    isPending,
}: {
    flag: FeatureFlag;
    onSave: (data: Partial<FeatureFlag>) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const [rollout, setRollout] = useState(flag.rolloutPercentage);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-2">
                    Rollout Percentage: {rollout}%
                </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={rollout}
                    onChange={(e) => setRollout(Number(e.target.value))}
                    className="w-full"
                />
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onSave({ rolloutPercentage: rollout })}
                    disabled={isPending}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                    Save Changes
                </button>
                <button
                    onClick={onCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

function CreateFlagModal({
    onSave,
    onCancel,
    isPending,
}: {
    onSave: (data: Partial<FeatureFlag>) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [enabled, setEnabled] = useState(false);
    const [rollout, setRollout] = useState(0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            description,
            enabled,
            rolloutPercentage: rollout,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold mb-4">Create Feature Flag</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Flag Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., new_checkout_ui"
                            required
                            className="w-full px-3 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What does this flag control?"
                            className="w-full px-3 py-2 border rounded-lg resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled(e.target.checked)}
                            id="enabled-checkbox"
                            className="w-4 h-4"
                        />
                        <label htmlFor="enabled-checkbox" className="text-sm font-medium">
                            Enable immediately
                        </label>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Rollout Percentage: {rollout}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={rollout}
                            onChange={(e) => setRollout(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="submit"
                            disabled={isPending || !name}
                            className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                        >
                            Create Flag
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
