/*
 * Langate Tailgate - shared landing script.
 *  1. Loads _meta.json for the current page (from [body data-meta-source]) or
 *     all four project metas when body.is-root, and fills in [data-file] spans
 *     with "Uppdaterad YYYY-MM-DD".
 *  2. Swaps the green placeholder icon for a real thumbnail when
 *     Tailgate/thumbs/<slug>.png exists (probes with an <img> onerror fallback).
 */

(function () {
	'use strict';

	function fmt(iso) {
		return 'Uppdaterad ' + iso;
	}

	function applyFilesMeta(meta, scopeKey) {
		const files = (meta && meta.files) || {};
		const sel = scopeKey ? '[data-file][data-scope="' + scopeKey + '"]' : '[data-file]';
		document.querySelectorAll(sel).forEach(function (el) {
			const info = files[el.dataset.file];
			if (info && info.updated) el.textContent = fmt(info.updated);
		});
	}

	function latestOf(meta) {
		const files = (meta && meta.files) || {};
		const dates = Object.values(files).map(function (f) { return f && f.updated; }).filter(Boolean);
		return dates.sort().slice(-1)[0];
	}

	async function loadProjectMeta() {
		const src = document.body.dataset.metaSource || '_meta.json';
		try {
			const r = await fetch(src, { cache: 'no-store' });
			if (!r.ok) return;
			const meta = await r.json();
			applyFilesMeta(meta);
		} catch (e) { /* silent */ }
	}

	async function loadRootMeta() {
		const slugs = ['fortbridge', 'humanit', 'flowsight', 'nschecks', 'claw', 'spai', 'mermaid', 'freecorner', 'pnp-dbbuilder', 'secaudit'];
		const results = await Promise.allSettled(slugs.map(function (s) {
			return fetch(s + '/_meta.json', { cache: 'no-store' }).then(function (r) {
				return r.ok ? r.json() : null;
			});
		}));
		results.forEach(function (res, i) {
			if (res.status !== 'fulfilled' || !res.value) return;
			const latest = latestOf(res.value);
			if (!latest) return;
			const el = document.querySelector('[data-project="' + slugs[i] + '"] .meta-updated');
			if (el) el.textContent = fmt(latest);
		});
	}

	function hookThumbFallback() {
		document.querySelectorAll('.project-thumb img').forEach(function (img) {
			img.addEventListener('error', function () { img.remove(); }, { once: true });
		});
	}

	document.addEventListener('DOMContentLoaded', function () {
		hookThumbFallback();
		if (document.body.classList.contains('is-root')) loadRootMeta();
		else loadProjectMeta();
	});
})();
