import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../../context/DataContext';
import { Download, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

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
			if (e.key === 'Escape') {
				closeViewer();
			} else if (e.key === 'ArrowLeft') {
				showPrev();
			} else if (e.key === 'ArrowRight') {
				showNext();
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [viewerIndex, closeViewer, showPrev, showNext]);

	const onDelete = async (name: string) => {
		if (!confirm(`Delete photo "${name}"?`)) return;
		try {
			await deleteRegistrationPhoto(name);
			await load(page);
		} catch (e) {
			alert('Delete failed');
		}
	};

	const totalPages = Math.max(1, Math.ceil(total / 25));

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Registration Photos</h2>
				{usage && (
					<div className="text-sm text-gray-600">
						{usage.count} files · {(usage.totalBytes / (1024*1024)).toFixed(1)} MB
					</div>
				)}
			</div>
			<div className="border rounded-lg overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preview</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
							<th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
							<th className="px-4 py-2"></th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{items.map(it => (
							<tr key={it.name}>
								<td className="px-4 py-2">
									<button
										onClick={() => setViewerIndex(items.findIndex(x => x.name === it.name))}
										className="focus:outline-none"
										title="View large"
									>
										<img loading="lazy" decoding="async" src={`${it.publicUrl}?width=100&height=100`} alt={it.name} width="40" height="40" className="w-10 h-10 object-cover rounded border border-gray-200 hover:opacity-90" />
									</button>
								</td>
								<td className="px-4 py-2 text-sm break-all">
									<button
										className="text-blue-600 hover:text-blue-800"
										onClick={() => setViewerIndex(items.findIndex(x => x.name === it.name))}
										title="View large"
									>
										{it.name}
									</button>
								</td>
								<td className="px-4 py-2 text-sm">{(it.size/1024).toFixed(0)} KB</td>
								<td className="px-4 py-2 text-right">
									<div className="flex items-center justify-end gap-3">
										<a
											href={it.publicUrl}
											download={it.name || `photo-${Date.now()}`}
											className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
											title="Download"
										>
											<Download size={16} className="mr-1" />
											<span className="hidden sm:inline">Download</span>
										</a>
										<a
											href={it.publicUrl}
											className="inline-flex items-center text-sm text-gray-700 hover:text-gray-900"
											target="_blank"
											rel="noopener noreferrer"
											title="Open in new tab"
										>
											<ExternalLink size={16} className="mr-1" />
											<span className="hidden sm:inline">Open</span>
										</a>
										<button onClick={() => onDelete(it.name)} className="text-red-600 hover:text-red-700 text-sm">Delete</button>
									</div>
								</td>
							</tr>
						))}
						{items.length === 0 && (
							<tr><td className="px-4 py-6 text-center text-gray-500" colSpan={4}>{loading ? 'Loading…' : 'No photos found'}</td></tr>
						)}
					</tbody>
				</table>
			</div>
			<div className="flex items-center justify-between">
				<button disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 rounded border disabled:opacity-50 text-gray-900">Prev</button>
				<div className="text-sm text-gray-900">Page {page} / {totalPages}</div>
				<button disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))} className="px-3 py-1 rounded border disabled:opacity-50 text-gray-900">Next</button>
			</div>

			{/* Lightbox Viewer */}
			{viewerIndex != null && items[viewerIndex] && createPortal(
				<div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={closeViewer}>
					{/* Sticky top-right controls */}
					<div className="absolute top-3 right-3 flex items-center gap-2">
						<a
							className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white text-sm flex items-center"
							href={items[viewerIndex].publicUrl}
							download={items[viewerIndex].name || `photo-${Date.now()}`}
							onClick={(e)=> e.stopPropagation()}
							title="Download photo"
						>
							<Download size={16} className="mr-1" /> Download
						</a>
						<button
							className="p-2 rounded bg-white/10 hover:bg-white/20 text-white"
							onClick={(e)=>{ e.stopPropagation(); closeViewer(); }}
							aria-label="Close"
						>
							<X size={18} />
						</button>
					</div>

					{/* Prev/Next */}
					{viewerIndex > 0 && (
						<button className="absolute left-3 md:left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Previous" onClick={(e)=>{ e.stopPropagation(); showPrev(); }}>
							<ChevronLeft size={24} />
						</button>
					)}
					{viewerIndex < items.length - 1 && (
						<button className="absolute right-3 md:right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white" aria-label="Next" onClick={(e)=>{ e.stopPropagation(); showNext(); }}>
							<ChevronRight size={24} />
						</button>
					)}

					{/* Image */}
					<div className="max-w-full max-h-full" onClick={(e)=> e.stopPropagation()}>
						<img
							src={items[viewerIndex].publicUrl}
							alt={items[viewerIndex].name}
							className="object-contain max-w-[90vw] max-h-[85vh] rounded shadow-lg"
						/>
						<div className="mt-3 text-center text-sm text-white/80 break-all">{items[viewerIndex].name}</div>
					</div>
				</div>
			, document.body)}
		</div>
	);
};

export default RegistrationPhotosPanel;

