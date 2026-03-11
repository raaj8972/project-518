import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { Download, X, ChevronLeft, ChevronRight, ExternalLink, Camera, Trash2, HardDrive, Image } from 'lucide-react';

export const RegistrationPhotosPanel: React.FC = () => {
	const { getRegistrationPhotos, computeRegistrationPhotosUsage, deleteRegistrationPhoto } = useData();
	const [items, setItems] = useState<Array<{ name: string; publicUrl: string; size: number; created_at: string | null }>>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(false);
	const [usage, setUsage] = useState<{ totalBytes: number; count: number } | null>(null);
	const [viewerIndex, setViewerIndex] = useState<number | null>(null);

	const load = async (p = page) => {
		if (!getRegistrationPhotos) return;
		setLoading(true);
		try {
			const { items: it, total: t } = await getRegistrationPhotos(p, 25);
			setItems(it);
			setTotal(t);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
	useEffect(() => { load(page); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page]);
	useEffect(() => {
		(async () => {
			try {
				if (computeRegistrationPhotosUsage) {
					const u = await computeRegistrationPhotosUsage();
					setUsage(u);
				}
			} catch {}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// --- Lightbox viewer helpers ---
	const closeViewer = useCallback(() => setViewerIndex(null), []);
	const showPrev = useCallback(() => {
		if (viewerIndex == null) return;
		setViewerIndex((i) => (i == null ? i : Math.max(0, i - 1)));
	}, [viewerIndex]);
	const showNext = useCallback(() => {
		if (viewerIndex == null) return;
		setViewerIndex((i) => (i == null ? i : Math.min(items.length - 1, i + 1)));
	}, [viewerIndex, items.length]);

	useEffect(() => {
		if (viewerIndex == null) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') closeViewer();
			else if (e.key === 'ArrowLeft') showPrev();
			else if (e.key === 'ArrowRight') showNext();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [viewerIndex, closeViewer, showPrev, showNext]);

	const onDelete = async (name: string) => {
		if (!confirm(`Delete photo "${name}"?`)) return;
		try {
			await deleteRegistrationPhoto(name);
			await load(page);
			// Refresh usage
			if (computeRegistrationPhotosUsage) {
				const u = await computeRegistrationPhotosUsage();
				setUsage(u);
			}
		} catch (e) {
			alert('Delete failed');
		}
	};

	const totalPages = Math.max(1, Math.ceil(total / 25));

	return (
		<div className="space-y-6">

			{/* ═══ Hero Header ═══ */}
			<div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600/20 via-blue-600/10 to-transparent border border-white/10 p-8">
				<div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
				<div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

				<div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
					<div>
						<div className="flex items-center gap-2 mb-2">
							<Camera size={14} className="text-cyan-400" />
							<span className="text-[10px] font-black text-cyan-400/80 uppercase tracking-[0.2em]">Storage Browser</span>
						</div>
						<h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
							Registration Photos
						</h2>
						<p className="text-sm text-gray-400 mt-1 font-medium">
							{total} photos in bucket
							{usage && <> · <HardDrive size={12} className="inline -mt-0.5 mx-1 text-gray-500" />{(usage.totalBytes / (1024*1024)).toFixed(1)} MB</>}
						</p>
					</div>

					{/* Stats Badges */}
					{usage && (
						<div className="flex items-center gap-4">
							<div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-center">
								<div className="text-2xl font-black text-white">{usage.count}</div>
								<div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Files</div>
							</div>
							<div className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3 text-center">
								<div className="text-2xl font-black text-white">{(usage.totalBytes / (1024*1024)).toFixed(1)}</div>
								<div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">MB Used</div>
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ═══ Photo Grid / Table ═══ */}
			<div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
				{/* Table Header */}
				<div className="grid grid-cols-[auto_1fr_auto_auto] gap-4 px-6 py-3 border-b border-white/5 bg-white/[0.02]">
					<span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Preview</span>
					<span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Name</span>
					<span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Size</span>
					<span className="text-[10px] font-black text-white/30 uppercase tracking-widest text-right">Actions</span>
				</div>

				{/* Rows */}
				{items.map((it, idx) => (
					<div
						key={it.name}
						className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center px-6 py-3 border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
					>
						{/* Preview Thumbnail */}
						<button
							onClick={() => setViewerIndex(idx)}
							className="focus:outline-none group/thumb"
							title="View large"
						>
							<div className="relative w-12 h-12 rounded-lg overflow-hidden border border-white/10 group-hover/thumb:border-cyan-500/30 transition-all">
								<img
									loading="lazy"
									decoding="async"
									src={`${it.publicUrl}?width=100&height=100`}
									alt={it.name}
									className="w-full h-full object-cover"
								/>
								<div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
									<Image size={14} className="text-white" />
								</div>
							</div>
						</button>

						{/* Name */}
						<button
							className="text-left text-sm text-gray-300 hover:text-cyan-400 truncate transition-colors font-medium"
							onClick={() => setViewerIndex(idx)}
							title={it.name}
						>
							{it.name}
						</button>

						{/* Size */}
						<span className="text-xs text-gray-500 font-bold whitespace-nowrap">
							{(it.size/1024).toFixed(0)} KB
						</span>

						{/* Actions */}
						<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<a
								href={it.publicUrl}
								download={it.name || `photo-${Date.now()}`}
								className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/10 text-gray-500 hover:text-cyan-400 transition-all"
								title="Download"
								onClick={e => e.stopPropagation()}
							>
								<Download size={14} />
							</a>
							<a
								href={it.publicUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/15 hover:bg-white/[0.06] text-gray-500 hover:text-white transition-all"
								title="Open in new tab"
							>
								<ExternalLink size={14} />
							</a>
							<button
								onClick={() => onDelete(it.name)}
								className="p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-rose-500/20 hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-all"
								title="Delete"
							>
								<Trash2 size={14} />
							</button>
						</div>
					</div>
				))}

				{/* Empty State */}
				{items.length === 0 && (
					<div className="px-6 py-16 text-center">
						<Camera size={32} className="mx-auto text-gray-700 mb-3" />
						<p className="text-sm text-gray-500 font-bold">{loading ? 'Loading photos…' : 'No photos found'}</p>
						<p className="text-xs text-gray-600 mt-1">Registration photos uploaded during sign-up will appear here.</p>
					</div>
				)}
			</div>

			{/* ═══ Pagination ═══ */}
			<div className="flex items-center justify-between">
				<button
					disabled={page<=1}
					onClick={() => setPage(p => Math.max(1, p-1))}
					className="px-4 py-2 rounded-xl text-sm font-bold bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
				>
					<ChevronLeft size={14} className="inline -mt-0.5 mr-1" /> Prev
				</button>
				<div className="text-xs font-bold text-gray-500">
					Page {page} / {totalPages}
				</div>
				<button
					disabled={page>=totalPages}
					onClick={() => setPage(p => Math.min(totalPages, p+1))}
					className="px-4 py-2 rounded-xl text-sm font-bold bg-white/[0.03] border border-white/10 text-gray-400 hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
				>
					Next <ChevronRight size={14} className="inline -mt-0.5 ml-1" />
				</button>
			</div>

			{/* ═══ Lightbox Viewer ═══ */}
			{viewerIndex != null && items[viewerIndex] && createPortal(
				<div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeViewer}>
					{/* Sticky top-right controls */}
					<div className="absolute top-4 right-4 flex items-center gap-2 z-10">
						<a
							className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-white text-sm font-bold flex items-center gap-2 transition-all"
							href={items[viewerIndex].publicUrl}
							download={items[viewerIndex].name || `photo-${Date.now()}`}
							onClick={(e)=>e.stopPropagation()}
							title="Download photo"
						>
							<Download size={14} /> Download
						</a>
						<button
							className="p-2.5 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-white transition-all"
							onClick={(e)=>{ e.stopPropagation(); closeViewer(); }}
							aria-label="Close"
						>
							<X size={16} />
						</button>
					</div>

					{/* Prev/Next */}
					{viewerIndex > 0 && (
						<button className="absolute left-4 md:left-8 p-3 rounded-2xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-white transition-all" aria-label="Previous" onClick={(e)=>{ e.stopPropagation(); showPrev(); }}>
							<ChevronLeft size={20} />
						</button>
					)}
					{viewerIndex < items.length - 1 && (
						<button className="absolute right-4 md:right-8 p-3 rounded-2xl bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-white transition-all" aria-label="Next" onClick={(e)=>{ e.stopPropagation(); showNext(); }}>
							<ChevronRight size={20} />
						</button>
					)}

					{/* Image */}
					<div className="max-w-full max-h-full" onClick={(e)=>e.stopPropagation()}>
						<img
							src={items[viewerIndex].publicUrl}
							alt={items[viewerIndex].name}
							className="object-contain max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl"
						/>
						<div className="mt-3 text-center text-sm text-white/60 break-all font-medium">{items[viewerIndex].name}</div>
					</div>
				</div>
			, document.body)}
		</div>
	);
};

export default RegistrationPhotosPanel;
