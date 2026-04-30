/* ============================================================
   SecAudit mockup — wiring
   Pure vanilla JS, no framework. Designed to run from file://.
   ============================================================ */

(function () {
    'use strict';

    var ITEMS = window.AUDIT_ITEMS || [];

    /* ----- Audit + finding data comes from state.js ------------- */

    var AUDITS         = window.AUDITS || [];
    var FINDINGS       = window.FINDINGS || {};
    var PREV_FINDINGS  = window.PREV_FINDINGS || {};
    var COMMENTS       = window.COMMENTS || {};
    var FRAMEWORK_MAP  = window.FRAMEWORK_MAP || {};
    var TREND_DATA     = window.TREND_DATA || {};
    var ACTIVITY       = window.ACTIVITY || [];
    var UNDO_LOG       = window.UNDO_LOG || [];

    var BENCHMARKS       = window.BENCHMARKS || {};
    var INTERVIEW_IDS    = window.INTERVIEW_IDS || [];
    var INTERVIEW_ANSWERS = window.INTERVIEW_ANSWERS || {};
    var LLM_REMEDIATION  = window.LLM_REMEDIATION || {};
    var LLM_TRANSLATION  = window.LLM_TRANSLATION || {};
    var TODAY_ISO        = '2026-04-30'; /* mockup "today" — drives stale-evidence calc */

    function isStale(finding) {
        if (!finding || !finding.checkedAt) return false;
        var d = Date.parse(finding.checkedAt);
        var t = Date.parse(TODAY_ISO);
        if (isNaN(d) || isNaN(t)) return false;
        var days = (t - d) / 86400000;
        return days > 90;
    }

    function daysSince(dateStr) {
        var d = Date.parse(dateStr);
        var t = Date.parse(TODAY_ISO);
        if (isNaN(d) || isNaN(t)) return null;
        return Math.floor((t - d) / 86400000);
    }

    function staleCount() {
        var n = 0;
        for (var k in FINDINGS) if (FINDINGS.hasOwnProperty(k) && isStale(FINDINGS[k])) n++;
        return n;
    }

    /* Aggregate finding counts (recomputed from FINDINGS) */
    function audit_findings(auditId) {
        var src = (auditId === 7) ? PREV_FINDINGS : FINDINGS;
        var counts = { high: 0, med: 0, low: 0 };
        for (var k in src) {
            if (src.hasOwnProperty(k) && src[k].status === 'fail') {
                if (src[k].risk === 'high') counts.high++;
                else if (src[k].risk === 'med') counts.med++;
                else counts.low++;
            }
        }
        return counts;
    }

    /* ----- Build category index from catalog ------------------- */

    function buildCategoryIndex() {
        var cats = {};
        var order = [];
        for (var i = 0; i < ITEMS.length; i++) {
            var c = ITEMS[i].category;
            if (!cats[c]) {
                cats[c] = { name: c, items: [], pass: 0, fail: 0, na: 0, pending: 0 };
                order.push(c);
            }
            cats[c].items.push(ITEMS[i]);
        }
        for (i = 0; i < order.length; i++) {
            var cat = cats[order[i]];
            for (var j = 0; j < cat.items.length; j++) {
                var f = FINDINGS[cat.items[j].id];
                if (!f) { cat.pending++; }
                else if (f.status === 'pass') { cat.pass++; }
                else if (f.status === 'fail') { cat.fail++; }
                else if (f.status === 'na')   { cat.na++; }
                else { cat.pending++; }
            }
        }
        return { cats: cats, order: order };
    }

    var CAT_INDEX = buildCategoryIndex();

    /* ----- Navigation ----------------------------------------- */

    function show(screenName) {
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.toggle('active', screens[i].dataset.screen === screenName);
        }
        var navs = document.querySelectorAll('.nav-item');
        for (i = 0; i < navs.length; i++) {
            navs[i].classList.toggle('active', navs[i].dataset.nav === screenName);
        }
        if (screenName === 'workspace') {
            if (!state.workspaceReady) { renderWorkspace(); state.workspaceReady = true; }
            renderCatalogBanner();
        }
        if (screenName === 'dashboard') {
            renderTenantRollup();
            renderCatalogBanner();
        }
        if (screenName === 'reference' && !state.referenceReady) { renderReference(); state.referenceReady = true; }
        if (screenName === 'interview') { renderInterview(); }
        document.getElementById('content').scrollTop = 0;
    }

    var state = {
        workspaceReady: false,
        referenceReady: false,
        activeCategory: null,
        activeItemId: null,
        statusFilter: 'all',
        riskFilter: 'all',         /* high / med / low / overdue / mine / all */
        tenantFilter: 'all',       /* tenant domain or 'all' */
        refSearch: '',
        refCategory: null,
        refLimit: 200,
        selectedIds: {},          /* { itemId: true } for bulk-select */
        reportFilter: 'all',       /* audit report filter */
        cmdActiveIdx: 0,
        cbMode: false              /* color-blind safe mode */
    };

    var TENANTS = window.TENANT_ASSIGNMENT || {};
    var DEFAULT_TENANT = 'acme-prod.onmicrosoft.com';
    var CURRENT_USER = 'peter@kalmstrom.com';

    function tenantOf(itemId) {
        return TENANTS[itemId] || DEFAULT_TENANT;
    }

    function isOverdue(finding) {
        if (!finding || !finding.lifecycle) return false;
        if (finding.lifecycle.state !== 'remediating') return false;
        if (!finding.lifecycle.targetDate) return false;
        var d = Date.parse(finding.lifecycle.targetDate);
        var t = Date.parse(TODAY_ISO);
        if (isNaN(d) || isNaN(t)) return false;
        return d < t;
    }

    function dueSoon(finding) {
        if (!finding || !finding.lifecycle) return false;
        if (finding.lifecycle.state !== 'remediating') return false;
        if (!finding.lifecycle.targetDate) return false;
        var d = Date.parse(finding.lifecycle.targetDate);
        var t = Date.parse(TODAY_ISO);
        if (isNaN(d) || isNaN(t)) return false;
        var days = (d - t) / 86400000;
        return days >= 0 && days <= 14;
    }

    function acceptanceExpiringSoon(finding) {
        if (!finding || !finding.lifecycle) return null;
        if (finding.lifecycle.state !== 'accepted') return null;
        if (!finding.lifecycle.expiresAt) return null;
        var d = Date.parse(finding.lifecycle.expiresAt);
        var t = Date.parse(TODAY_ISO);
        if (isNaN(d) || isNaN(t)) return null;
        var days = Math.floor((d - t) / 86400000);
        if (days < 0) return { expired: true, days: -days };
        if (days <= 30) return { expired: false, days: days };
        return null;
    }

    function selectionCount() {
        var n = 0;
        for (var k in state.selectedIds) if (state.selectedIds.hasOwnProperty(k)) n++;
        return n;
    }
    function clearSelection() { state.selectedIds = {}; }

    function applyBulk(status, riskOverride) {
        var changed = [];
        for (var k in state.selectedIds) {
            if (!state.selectedIds.hasOwnProperty(k)) continue;
            var id = parseInt(k, 10);
            var prev = FINDINGS[id] ? JSON.parse(JSON.stringify(FINDINGS[id])) : null;
            FINDINGS[id] = FINDINGS[id] || { observation: '', risk: 'none' };
            FINDINGS[id].status = status;
            if (status === 'fail') {
                if (riskOverride) FINDINGS[id].risk = riskOverride;
                else if (!FINDINGS[id].risk || FINDINGS[id].risk === 'none') FINDINGS[id].risk = 'med';
            } else {
                FINDINGS[id].risk = 'none';
                if (FINDINGS[id].lifecycle) delete FINDINGS[id].lifecycle;
            }
            FINDINGS[id].checkedAt = TODAY_ISO;
            changed.push({ id: id, prev: prev });
        }
        UNDO_LOG.push({ kind: 'bulk', changes: changed });
        rebuildIndex();
        clearSelection();
        renderItemList();
        renderCategoryList(document.getElementById('cat-filter') ? document.getElementById('cat-filter').value : '');
        if (state.activeItemId) renderDetail(state.activeItemId);
        var label = statusLabel(status) + (status === 'fail' ? ' (' + (riskOverride || 'med').toUpperCase() + ')' : '');
        flashFooter(changed.length + ' item' + (changed.length === 1 ? '' : 's') + ' → ' + label + '. Ctrl+Z to undo.');
    }

    function rebuildIndex() {
        CAT_INDEX = buildCategoryIndex();
    }

    function undoLast() {
        var op = UNDO_LOG.pop();
        if (!op) { flashFooter('Nothing to undo.'); return; }
        if (op.kind === 'bulk' || op.kind === 'single') {
            for (var i = 0; i < op.changes.length; i++) {
                var c = op.changes[i];
                if (c.prev === null) delete FINDINGS[c.id];
                else FINDINGS[c.id] = c.prev;
            }
            rebuildIndex();
            renderItemList();
            renderCategoryList(document.getElementById('cat-filter') ? document.getElementById('cat-filter').value : '');
            if (state.activeItemId) renderDetail(state.activeItemId);
            flashFooter('Undid ' + op.changes.length + ' change' + (op.changes.length === 1 ? '' : 's') + '.');
        }
    }

    /* ----- Audits screen rendering ----------------------------- */

    function auditLogo(audit, size) {
        if (!audit.logoId) return '';
        var w = size || 28;
        return '<svg class="customer-logo" style="width:' + w + 'px;height:' + w + 'px" aria-hidden="true"><use href="#' + audit.logoId + '"/></svg>';
    }

    function renderAuditsTable(filter) {
        var tbody = document.getElementById('audits-tbody');
        if (!tbody) return;
        var html = '';
        var f = filter || 'all';
        for (var i = 0; i < AUDITS.length; i++) {
            var a = AUDITS[i];
            if (a.archived && f !== 'all' && f !== 'archived') continue;
            if (f === 'in-progress' && a.status !== 'In progress') continue;
            if (f === 'review' && a.status !== 'Review') continue;
            if (f === 'delivered' && a.status !== 'Delivered') continue;
            if (f === 'archived' && !a.archived) continue;
            var pct = (a.checked / 624 * 100).toFixed(0);
            var c = audit_findings(a.id);
            var totalFindings = c.high + c.med + c.low;
            html +=
                '<tr class="clickable-row" data-action="open-workspace" data-audit-id="' + a.id + '">' +
                '<td><div style="display:flex;align-items:center;gap:10px">' + auditLogo(a, 28) +
                  '<div><strong>' + escape(a.customer) + '</strong>' +
                  (a.archived ? ' <span class="badge badge-gray" style="margin-left:6px">Archived</span>' : '') +
                  '</div></div></td>' +
                '<td><code>' + escape(a.tenant) + '</code></td>' +
                '<td>' + escape(a.started) + '</td>' +
                '<td>' + escape(a.lastActivity) + '</td>' +
                '<td><div class="row-progress"><div class="row-progress-bar" style="width:' + pct + '%"></div></div>' +
                '<span class="row-progress-label">' + a.checked + ' / 624</span></td>' +
                '<td>' +
                  '<span class="badge badge-red">' + c.high + '</span> ' +
                  '<span class="badge badge-orange">' + c.med + '</span> ' +
                  '<span class="badge badge-blue">' + c.low + '</span> ' +
                  '<span class="text-muted" style="font-size:11px">(' + totalFindings + ')</span>' +
                '</td>' +
                '<td><span class="badge ' + a.badge + '">' + escape(a.status) + '</span></td>' +
                '<td class="row-actions">Open &rsaquo;</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    function renderDashboardAudits() {
        var tbody = document.getElementById('dashboard-audits-tbody');
        if (!tbody) return;
        var html = '';
        var live = AUDITS.filter(function (a) { return !a.archived; }).slice(0, 4);
        for (var i = 0; i < live.length; i++) {
            var a = live[i];
            var pct = (a.checked / 624 * 100).toFixed(0);
            html +=
                '<tr class="clickable-row" data-action="open-workspace" data-audit-id="' + a.id + '">' +
                '<td><div style="display:flex;align-items:center;gap:10px">' + auditLogo(a, 26) +
                  '<strong>' + escape(a.customer) + '</strong></div></td>' +
                '<td><code>' + escape(a.tenant) + '</code></td>' +
                '<td>' + escape(a.started) + '</td>' +
                '<td><div class="row-progress"><div class="row-progress-bar" style="width:' + pct + '%"></div></div>' +
                '<span class="row-progress-label">' + a.checked + ' / 624</span></td>' +
                '<td><span class="badge ' + a.badge + '">' + escape(a.status) + '</span></td>' +
                '<td class="row-actions">Open &rsaquo;</td>' +
                '</tr>';
        }
        tbody.innerHTML = html;
    }

    /* ----- Dashboard hero ------------------------------------- */

    function renderDashboardHero() {
        var host = document.getElementById('dashboard-hero');
        if (!host) return;
        var a = ACTIVE_AUDIT;
        var totals = computeTotalsFor(FINDINGS);
        host.innerHTML =
            '<div class="dashboard-hero-art">' +
                '<div class="hero-eyebrow">Active engagement &middot; Catalog ' + escape(a.catalogVersion || '') + '</div>' +
                '<div class="hero-title-row">' +
                    auditLogo(a, 56) +
                    '<div class="hero-title-text">' +
                        '<h2 class="hero-title">' + escape(a.customer) + '</h2>' +
                        '<div class="hero-sub">Microsoft 365 &amp; Azure tenant assessment &middot; <code style="background:rgba(255,255,255,0.14);padding:1px 6px;border-radius:3px">' + escape(a.tenant) + '</code></div>' +
                    '</div>' +
                '</div>' +
                '<div class="hero-sub" style="margin-top:8px">Comprehensive review of identity, endpoint, data, and infrastructure controls. ' +
                    '<strong style="color:#fff">' + (totals.pass + totals.fail + totals.na) + ' of 624</strong> items checked &middot; ' +
                    '<strong style="color:#fff">' + totals.fail + '</strong> failures recorded.</div>' +
                '<div class="hero-actions">' +
                    '<button class="btn btn-primary" data-nav="workspace">' + svg('n-workspace') + ' Open workspace</button>' +
                    '<button class="btn btn-secondary" data-action="audit-report">' + svg('a-shield-check') + ' Status report</button>' +
                    (a.previousAuditId ? '<button class="btn btn-secondary" data-action="compare">' + svg('a-arrow-right') + ' Compare with previous</button>' : '') +
                '</div>' +
            '</div>' +
            '<div class="dashboard-hero-stat">' +
                heroStat('green', 's-pass', 'Verified pass', totals.pass, '') +
                heroStat('red',   's-fail', 'Failures', totals.fail, totals.high + ' high · ' + totals.med + ' med · ' + totals.low + ' low') +
                heroStat('',      'a-clock', 'Pending', totals.pending, '~' + Math.round(totals.pending / 35) + ' working days remaining') +
            '</div>';
    }

    function heroStat(tone, iconId, label, value, sub) {
        return '<div class="hero-stat-row">' +
            '<div class="hero-stat-icon ' + tone + '"><svg class="icon icon-md" aria-hidden="true"><use href="#' + iconId + '"/></svg></div>' +
            '<div><div class="hero-stat-label">' + escape(label) + '</div>' +
            '<div class="hero-stat-value">' + value + '</div>' +
            (sub ? '<div class="hero-stat-sub">' + escape(sub) + '</div>' : '') +
            '</div></div>';
    }

    function computeTotalsFor(findings) {
        var totals = { pass: 0, fail: 0, na: 0, pending: 0, high: 0, med: 0, low: 0 };
        for (var i = 0; i < ITEMS.length; i++) {
            var f = findings[ITEMS[i].id];
            if (!f) totals.pending++;
            else {
                if (f.status === 'pass') totals.pass++;
                else if (f.status === 'fail') {
                    totals.fail++;
                    if (f.risk === 'high') totals.high++;
                    else if (f.risk === 'med') totals.med++;
                    else totals.low++;
                } else if (f.status === 'na') totals.na++;
                else totals.pending++;
            }
        }
        return totals;
    }

    /* ----- Activity feed -------------------------------------- */

    /* ----- Customer interview mode --------------------------- */

    function renderInterview() {
        var qs = document.getElementById('interview-questions');
        var prog = document.getElementById('interview-progress');
        if (!qs) return;
        var answered = 0;
        var total = INTERVIEW_IDS.length;
        for (var k = 0; k < INTERVIEW_IDS.length; k++) {
            if (INTERVIEW_ANSWERS[INTERVIEW_IDS[k]]) answered++;
        }
        var pct = total ? Math.round(answered / total * 100) : 0;
        if (prog) prog.innerHTML =
            '<div class="iv-progress-track"><div class="iv-progress-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="iv-progress-text"><strong>' + answered + '</strong> of ' + total + ' questions answered &middot; ' + pct + '% complete</div>';

        var byCat = {};
        var order = [];
        for (var i = 0; i < INTERVIEW_IDS.length; i++) {
            var id = INTERVIEW_IDS[i];
            var item = ITEMS[id - 1];
            if (!item) continue;
            if (!byCat[item.category]) { byCat[item.category] = []; order.push(item.category); }
            byCat[item.category].push(item);
        }
        var html = '';
        for (var c = 0; c < order.length; c++) {
            html += '<div class="iv-category"><h2>' + productIcon(order[c], 'icon-product-sm') + ' <span>' + escape(order[c]) + '</span></h2>';
            for (var j = 0; j < byCat[order[c]].length; j++) {
                html += renderInterviewQuestion(byCat[order[c]][j]);
            }
            html += '</div>';
        }
        qs.innerHTML = html;

        var badge = document.getElementById('nav-interview-badge');
        if (badge) {
            var pendingQs = total - answered;
            if (pendingQs > 0) { badge.style.display = ''; badge.textContent = pendingQs; }
            else badge.style.display = 'none';
        }
    }

    function renderInterviewQuestion(item) {
        var ans = INTERVIEW_ANSWERS[item.id] || {};
        var question = phraseAsQuestion(item.description);
        var v = ans.answer || '';
        var html = '<div class="iv-q" data-iv-id="' + item.id + '">' +
            '<div class="iv-q-text">' +
                '<span class="iv-q-id">#' + item.id + '</span>' +
                '<span>' + escape(question) + '</span>' +
            '</div>' +
            '<div class="iv-q-controls">' +
                '<div class="iv-answer-btns">' +
                    ivAnswerBtn(item.id, 'yes',     'Yes',     v) +
                    ivAnswerBtn(item.id, 'partial', 'Partial', v) +
                    ivAnswerBtn(item.id, 'no',      'No',      v) +
                    ivAnswerBtn(item.id, 'na',      'N/A',     v) +
                '</div>' +
                '<textarea class="iv-notes" placeholder="Customer notes&hellip;" data-iv-notes="' + item.id + '">' + escape(ans.notes || '') + '</textarea>' +
                (ans.answeredBy ? '<div class="iv-answered-by">' + escape(ans.answeredBy) + ' &middot; ' + escape(ans.answeredAt || '') + '</div>' : '') +
            '</div>' +
        '</div>';
        return html;
    }

    function ivAnswerBtn(itemId, value, label, current) {
        var cls = 'iv-answer iv-' + value + (current === value ? ' active' : '');
        return '<button class="' + cls + '" data-iv-set="' + value + '" data-item-id="' + itemId + '">' + label + '</button>';
    }

    function phraseAsQuestion(desc) {
        if (!desc) return '';
        var d = desc.trim();
        if (/^(do|does|is|are|has|have|can|will|should)\b/i.test(d) || /\?$/.test(d)) return d.replace(/\.$/, '?');
        if (/^(\w+ed|present|enabled|available|configured|rotated|monitored|reviewed|deployed|in place|maintained)\b/i.test(d)) return 'Is ' + d.charAt(0).toLowerCase() + d.substring(1) + '?';
        return d.replace(/\.$/, '') + '?';
    }

    function shareInterviewLink() {
        var url = 'https://secaudit.langate.se/interview/acme/' + Math.random().toString(36).slice(2, 10);
        var msg = 'Share link copied to clipboard: ' + url;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(function () { flashFooter(msg); });
        } else {
            flashFooter(msg);
        }
    }

    /* ----- Cross-customer benchmarks ------------------------- */

    function categoryPassRate(catName) {
        var c = CAT_INDEX.cats[catName];
        if (!c) return null;
        var checked = c.pass + c.fail + c.na;
        if (checked === 0) return null;
        return Math.round(c.pass / checked * 100);
    }

    function benchQuartile(catName, rate) {
        var b = BENCHMARKS[catName];
        if (!b) return null;
        if (rate >= b.top) return { tier: 'top',     label: 'Top quartile', color: 'var(--accent-green)' };
        if (rate >= b.q3)  return { tier: 'above',   label: 'Above median', color: '#9CD79C' };
        if (rate >= b.median) return { tier: 'median', label: 'Median',       color: 'var(--primary-teal)' };
        if (rate >= b.q1)  return { tier: 'below',   label: 'Below median', color: 'var(--accent-gold)' };
        return { tier: 'bottom', label: 'Bottom quartile', color: 'var(--accent-red)' };
    }

    function benchmarkBar(catName) {
        var rate = categoryPassRate(catName);
        var b = BENCHMARKS[catName];
        if (rate === null || !b) return '<span class="text-muted" style="font-size:11px">no benchmark</span>';
        var w = 100;
        var px = function (n) { return (n / 100 * w).toFixed(1) + 'px'; };
        var tier = benchQuartile(catName, rate);
        return '<span class="bm-bar" title="Median ' + b.median + '% · You ' + rate + '% (' + tier.label + ')">' +
            '<span class="bm-track" style="width:' + w + 'px"></span>' +
            '<span class="bm-q1q3" style="left:' + px(b.q1) + ';width:' + px(b.q3 - b.q1) + '"></span>' +
            '<span class="bm-median" style="left:' + px(b.median) + '"></span>' +
            '<span class="bm-you" style="left:' + px(rate) + ';background:' + tier.color + '" title="You: ' + rate + '%"></span>' +
        '</span>';
    }

    function renderBenchmarksWidget() {
        var host = document.getElementById('benchmarks-widget');
        if (!host) return;
        var keys = Object.keys(BENCHMARKS);
        keys.sort(function (a, b) {
            var ra = categoryPassRate(a) || 0, rb = categoryPassRate(b) || 0;
            var da = ra - BENCHMARKS[a].median;
            var db = rb - BENCHMARKS[b].median;
            return da - db;
        });
        var top = keys.slice(0, 8);
        var html = '<table class="bm-table"><tbody>';
        for (var i = 0; i < top.length; i++) {
            var name = top[i];
            var rate = categoryPassRate(name);
            var b = BENCHMARKS[name];
            if (rate === null || !b) continue;
            var delta = rate - b.median;
            var deltaCls = delta < -10 ? 'bm-delta-bad' : delta < 0 ? 'bm-delta-warn' : 'bm-delta-good';
            html += '<tr>' +
                '<td class="bm-name">' + productIcon(name, 'icon-product-sm') + '<span>' + escape(name) + '</span></td>' +
                '<td class="bm-rate">' + rate + '%</td>' +
                '<td class="bm-bar-cell">' + benchmarkBar(name) + '</td>' +
                '<td class="bm-delta ' + deltaCls + '">' + (delta >= 0 ? '+' : '') + delta + ' pp</td>' +
                '<td class="bm-cohort">vs portfolio median ' + b.median + '% (n=' + b.n + ')</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        host.innerHTML = html;
    }

    /* ----- Tenant posture heatmap ---------------------------- */

    function renderHeatmap(targetId, options) {
        options = options || {};
        var host = document.getElementById(targetId);
        if (!host) return;
        var html = '<div class="heatmap-cells">';
        for (var i = 0; i < ITEMS.length; i++) {
            var it = ITEMS[i];
            var f = FINDINGS[it.id];
            var status = f ? f.status : 'pending';
            var stale = isStale(f);
            var hasLifecycle = f && f.lifecycle && f.lifecycle.state && f.lifecycle.state !== 'open';
            var risk = (status === 'fail' && f && f.risk && f.risk !== 'none') ? f.risk : null;
            var cls = 'hm-cell hm-' + status +
                      (risk ? ' hm-' + risk : '') +
                      (stale ? ' hm-stale' : '') +
                      (hasLifecycle ? ' hm-lifecycle' : '');
            var title = '#' + it.id + ' ' + it.category + ' — ' + statusLabel(status) +
                        (risk ? ' · ' + risk.toUpperCase() + ' risk' : '') +
                        (stale ? ' (stale)' : '') +
                        (hasLifecycle ? ' / ' + lifecycleLabel(f.lifecycle.state) : '');
            html += '<button class="' + cls + '" title="' + escape(title) + '" data-jump-item="' + it.id + '" aria-label="' + escape(title) + '"></button>';
        }
        html += '</div>';
        if (!options.bare) {
            html =
                '<div class="heatmap-legend">' +
                    '<span><span class="hm-swatch" style="background:#02B896"></span>Pass</span>' +
                    '<span><span class="hm-swatch" style="background:#B55852"></span>Fail · High</span>' +
                    '<span><span class="hm-swatch" style="background:#F5A623"></span>Fail · Med</span>' +
                    '<span><span class="hm-swatch" style="background:#537780"></span>Fail · Low</span>' +
                    '<span><span class="hm-swatch" style="background:#686b6e"></span>N/A</span>' +
                    '<span><span class="hm-swatch" style="background:#DBE4EA"></span>Pending</span>' +
                    '<span><span class="hm-swatch hm-cell hm-stale" style="position:relative;display:inline-block"></span>Stale</span>' +
                    '<span><span class="hm-swatch hm-cell hm-lifecycle" style="position:relative;display:inline-block"></span>In lifecycle</span>' +
                '</div>' + html;
        }
        host.innerHTML = html;
    }

    function renderActivity() {
        var ul = document.getElementById('activity-feed');
        if (!ul) return;
        var html = '';
        for (var i = 0; i < ACTIVITY.length; i++) {
            var ev = ACTIVITY[i];
            var item = ev.itemId ? ITEMS[ev.itemId - 1] : null;
            var bodyText = ev.text;
            if (item) bodyText = bodyText.replace(/\b(commented|attached|marked|ran)\b[\s\S]*$/, function (m) {
                return m;
            });
            html += '<li' + (ev.itemId ? ' class="clickable-row" data-jump-item="' + ev.itemId + '"' : '') + '>' +
                '<span class="activity-time">' + escape(ev.time) + '</span>' +
                '<span class="activity-actor">' + escape(ev.actor) + '</span>' +
                ' ' + escape(ev.text) +
                '</li>';
        }
        ul.innerHTML = html;
    }

    /* ----- Findings-by-category bars (dashboard) --------------- */

    function renderFindingsBars() {
        var ul = document.getElementById('findings-bars-list');
        if (!ul) return;
        var ranked = CAT_INDEX.order.map(function (n) {
            return { name: n, count: CAT_INDEX.cats[n].fail };
        });
        ranked.sort(function (a, b) { return b.count - a.count; });
        var demo = [
            { name: 'Identity & Access (extended)', count: 8, severity: 'high' },
            { name: 'Conditional Access', count: 6, severity: 'high' },
            { name: 'Defender (extended)', count: 5, severity: 'high' },
            { name: 'Applications & Service Principals', count: 4, severity: 'high' },
            { name: 'Exchange Online', count: 4, severity: 'med' },
            { name: 'SharePoint & OneDrive', count: 3, severity: 'med' },
            { name: 'Authentication & MFA', count: 3, severity: 'med' },
            { name: 'Logging & Monitoring', count: 2, severity: 'low' }
        ];
        var max = demo[0].count;
        var html = '';
        for (var i = 0; i < demo.length; i++) {
            var d = demo[i];
            var w = (d.count / max * 100).toFixed(0);
            var cls = d.severity === 'high' ? '' : (d.severity === 'med' ? 'low' : 'lower');
            html +=
                '<li>' +
                '<span class="fb-name" style="display:flex;align-items:center;gap:8px">' +
                    productIcon(d.name, 'icon-product-sm') +
                    '<span>' + escape(d.name) + '</span>' +
                '</span>' +
                '<span class="fb-count">' + d.count + '</span>' +
                '<div class="fb-bar"><div class="fb-bar-fill ' + cls + '" style="width:' + w + '%"></div></div>' +
                '</li>';
        }
        ul.innerHTML = html;
    }

    /* ----- Workspace rendering --------------------------------- */

    function renderWorkspace() {
        renderCategoryList();
        var firstCat = CAT_INDEX.order[0];
        selectCategory(firstCat);
    }

    function renderCategoryList(filter) {
        var ul = document.getElementById('category-list');
        if (!ul) return;
        var html = '';
        var f = (filter || '').toLowerCase();
        for (var i = 0; i < CAT_INDEX.order.length; i++) {
            var name = CAT_INDEX.order[i];
            if (f && name.toLowerCase().indexOf(f) === -1) continue;
            var cat = CAT_INDEX.cats[name];
            var done = cat.pass + cat.fail + cat.na;
            var pct = (done / cat.items.length * 100).toFixed(0);
            var activeCls = state.activeCategory === name ? ' class="active"' : '';
            html +=
                '<li' + activeCls + ' data-cat="' + escape(name) + '">' +
                '<span class="cat-product">' + productIcon(name, 'icon-product') + '</span>' +
                '<span class="cat-name">' + escape(name) + '</span>' +
                '<span class="cat-count">' + done + '/' + cat.items.length + '</span>' +
                '<div class="cat-progress"><div class="cat-progress-fill" style="width:' + pct + '%"></div></div>' +
                '</li>';
        }
        ul.innerHTML = html;
    }

    function selectCategory(name) {
        var hadSelection = selectionCount();
        state.activeCategory = name;
        state.statusFilter = 'all';
        if (hadSelection) {
            clearSelection();
            flashFooter('Selection cleared on category change (' + hadSelection + ' item' + (hadSelection === 1 ? '' : 's') + ').');
        }
        renderCategoryList(document.getElementById('cat-filter') ? document.getElementById('cat-filter').value : '');
        var titleEl = document.getElementById('items-pane-title');
        if (titleEl) titleEl.textContent = name;
        renderItemList();
        var statusBtns = document.querySelectorAll('.status-filter .filter-chip');
        for (var i = 0; i < statusBtns.length; i++) {
            statusBtns[i].classList.toggle('active', statusBtns[i].dataset.status === 'all');
        }
        var cat = CAT_INDEX.cats[name];
        if (cat && cat.items.length) selectItem(cat.items[0].id);
    }

    function getStatus(itemId) {
        var f = FINDINGS[itemId];
        return f ? f.status : 'pending';
    }

    function renderItemList() {
        var ul = document.getElementById('item-list');
        if (!ul) return;
        var cat = CAT_INDEX.cats[state.activeCategory];
        if (!cat) { ul.innerHTML = ''; return; }
        var html = '';
        for (var i = 0; i < cat.items.length; i++) {
            var item = cat.items[i];
            var status = getStatus(item.id);
            var f = FINDINGS[item.id];
            var stale = isStale(f);
            var hasLifecycle = f && f.lifecycle && f.lifecycle.state && f.lifecycle.state !== 'open';
            if (state.statusFilter === 'stale' && !stale) continue;
            else if (state.statusFilter === 'lifecycle' && !hasLifecycle) continue;
            else if (state.statusFilter !== 'all' && state.statusFilter !== 'stale' && state.statusFilter !== 'lifecycle' && state.statusFilter !== status) continue;

            /* Risk filter */
            if (state.riskFilter !== 'all') {
                if (state.riskFilter === 'high' || state.riskFilter === 'med' || state.riskFilter === 'low') {
                    if (!f || f.status !== 'fail' || f.risk !== state.riskFilter) continue;
                } else if (state.riskFilter === 'overdue') {
                    if (!isOverdue(f)) continue;
                } else if (state.riskFilter === 'mine') {
                    if (!f || !f.lifecycle || f.lifecycle.owner !== CURRENT_USER) continue;
                }
            }

            /* Tenant filter */
            if (state.tenantFilter !== 'all' && tenantOf(item.id) !== state.tenantFilter) continue;

            var activeCls = state.activeItemId === item.id ? ' active' : '';
            var selectedCls = state.selectedIds[item.id] ? ' selected' : '';
            var checked = state.selectedIds[item.id] ? ' checked' : '';
            var riskCls = (status === 'fail' && f && f.risk && f.risk !== 'none') ? ' risk-' + f.risk : '';
            var statusBadge = renderItemStatusBadge(status, f);
            var overdue = isOverdue(f);
            var dueIn = dueSoon(f);
            html +=
                '<li class="' + activeCls + selectedCls + riskCls + '" data-item-id="' + item.id + '">' +
                '<label class="item-check" data-act="check" data-item-id="' + item.id + '">' +
                    '<input type="checkbox" data-item-id="' + item.id + '"' + checked + '/>' +
                    '<span class="item-check-box" aria-hidden="true"></span>' +
                '</label>' +
                statusIcon(status) +
                productIcon(item.category, 'icon-product-sm') +
                '<div class="item-main-text">' +
                '<div class="item-text">' + escape(item.description) + '</div>' +
                '<div class="item-id">#' + item.id + '</div>' +
                '</div>' +
                '<div class="item-side">' +
                '<div class="item-badges">' +
                    statusBadge +
                    (hasLifecycle ? ' <span class="badge ' + lifecycleBadgeClass(f.lifecycle.state) + '" title="' + escape(lifecycleLabel(f.lifecycle.state)) + '">' + escape(lifecycleLabel(f.lifecycle.state)) + '</span>' : '') +
                    (overdue ? ' <span class="badge badge-overdue" title="Past target date ' + escape(f.lifecycle.targetDate) + '">Overdue</span>' :
                        dueIn ? ' <span class="badge badge-due-soon" title="Due ' + escape(f.lifecycle.targetDate) + '">Due soon</span>' : '') +
                    (stale ? ' <span class="badge badge-orange stale-pill" title="Verified ' + daysSince(f.checkedAt) + ' days ago"><svg class="icon icon-xs" aria-hidden="true"><use href="#a-stale"/></svg></span>' : '') +
                '</div>' +
                '<div class="item-actions">' +
                    '<button class="item-action-btn ps" data-act="ps" data-item-id="' + item.id + '" title="Show PowerShell command">' +
                        svg('a-powershell', 'icon') + ' PowerShell' +
                    '</button>' +
                    '<button class="item-action-btn" data-act="portal" data-item-id="' + item.id + '" title="Open Microsoft 365 / Azure portal page">' +
                        svg('a-portal', 'icon') + ' Portal' +
                    '</button>' +
                '</div>' +
                '</div>' +
                '</li>';
        }
        ul.innerHTML = html || '<li class="empty-state" style="cursor:default"><div class="empty-help">No items match this filter.</div></li>';
        renderBulkBar();
    }

    function renderBulkBar() {
        var bar = document.getElementById('bulk-bar');
        var n = selectionCount();
        if (!bar) return;
        if (n === 0) { bar.hidden = true; return; }
        bar.hidden = false;
        bar.querySelector('[data-bulk-count]').textContent = n + ' item' + (n === 1 ? '' : 's') + ' selected';
    }

    /* statusBadgeClass + statusLabel come from helpers.js (window.SA) */

    function renderItemStatusBadge(status, finding) {
        if (status !== 'fail' || !finding || !finding.risk || finding.risk === 'none') {
            return '<span class="badge ' + statusBadgeClass(status) + '">' + statusLabel(status) + '</span>';
        }
        var risk = finding.risk;
        var cls = risk === 'high' ? 'badge-red'
                : risk === 'med'  ? 'badge-orange'
                : risk === 'low'  ? 'badge-teal'
                                  : 'badge-red';
        var label = 'Fail · ' + risk.toUpperCase();
        var glyph = H.riskGlyph(risk);
        return '<span class="badge ' + cls + ' badge-fail-risk" data-glyph="' + glyph + '" title="Failure with ' + risk + ' risk">' + label + '</span>';
    }

    function lifecycleLabel(state) {
        return state === 'acknowledged' ? 'Acknowledged' :
               state === 'accepted'     ? 'Accepted' :
               state === 'remediating'  ? 'Remediating' :
               state === 'verified'     ? 'Verified fixed' :
               state === 'open'         ? 'Open' :
                                          state || 'Open';
    }
    function lifecycleBadgeClass(state) {
        return state === 'accepted'    ? 'badge-blue' :
               state === 'remediating' ? 'badge-orange' :
               state === 'verified'    ? 'badge-green' :
               state === 'acknowledged' ? 'badge-teal' :
                                          'badge-red';
    }

    function selectItem(itemId) {
        state.activeItemId = itemId;
        var lis = document.querySelectorAll('#item-list li');
        for (var i = 0; i < lis.length; i++) {
            lis[i].classList.toggle('active', String(lis[i].dataset.itemId) === String(itemId));
        }
        renderDetail(itemId);
    }

    function renderDetail(itemId) {
        var item = ITEMS[itemId - 1];
        var detail = document.getElementById('detail-body');
        var pill = document.getElementById('detail-id-pill');
        if (!item || !detail) return;
        pill.textContent = '#' + item.id;
        var f = FINDINGS[item.id] || {};
        var status = f.status || 'pending';
        var risk = f.risk || 'none';

        var html =
            '<div class="detail-cat-row" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
                productIcon(item.category, 'icon-product-lg') +
                '<div class="detail-cat" style="margin-bottom:0">' + escape(item.category) + '</div>' +
            '</div>' +
            '<div class="detail-title">' + escape(item.description) + '</div>' +

            '<div class="detail-section">' +
                '<div class="detail-label">Expected / recommended</div>' +
                '<div class="detail-value">' + escape(item.expected) + '</div>' +
            '</div>' +

            '<div class="detail-section">' +
                '<div class="detail-label">How to read</div>' +
                '<div class="detail-value-mono">' + escape(item.how) + '</div>' +
            '</div>' +

            '<div class="detail-section">' +
                '<div class="detail-label">Permission needed</div>' +
                '<div class="detail-value"><code>' + escape(item.perm) + '</code></div>' +
            '</div>' +

            '<div class="detail-actions">' +
                '<button class="btn btn-secondary" data-act="ps" data-item-id="' + item.id + '">' +
                    svg('a-powershell') + ' PowerShell' +
                '</button>' +
                '<button class="btn btn-secondary" data-act="portal" data-item-id="' + item.id + '">' +
                    svg('a-portal') + ' Open in portal' +
                '</button>' +
            '</div>' +

            '<div class="detail-finding">' +
                '<div class="detail-finding-title">Finding</div>' +

                '<div class="detail-label">Status</div>' +
                '<div class="status-row">' +
                    statusBtn('pending', status) +
                    statusBtn('pass', status) +
                    statusBtn('fail', status) +
                    statusBtn('na', status) +
                '</div>' +

                '<div class="detail-label">Risk</div>' +
                '<div class="risk-row">' +
                    riskPill('low', risk) +
                    riskPill('med', risk) +
                    riskPill('high', risk) +
                '</div>' +

                '<div class="detail-label-row">' +
                    '<div class="detail-label">Observation</div>' +
                    '<button class="ai-assist-btn" data-act="ai-translate" data-item-id="' + item.id + '" title="Rewrite as customer-friendly summary">' +
                        svg('a-sparkle', 'icon-xs') + ' Translate for customer' +
                    '</button>' +
                '</div>' +
                '<textarea data-textarea="observation" data-item-id="' + item.id + '" placeholder="What you observed in the tenant&hellip;">' + escape(f.observation || '') + '</textarea>' +

                '<div class="detail-label-row">' +
                    '<div class="detail-label">Remediation</div>' +
                    '<button class="ai-assist-btn" data-act="ai-remediation" data-item-id="' + item.id + '" title="Draft remediation steps">' +
                        svg('a-sparkle', 'icon-xs') + ' Draft remediation' +
                    '</button>' +
                '</div>' +
                '<textarea data-textarea="remediation" data-item-id="' + item.id + '" placeholder="Recommended action&hellip;">' + escape(f.remediation || '') + '</textarea>' +

                '<div class="detail-label">Evidence</div>' +
                renderEvidence(f.evidence, item.id) +
            '</div>' +

            renderLifecycleBlock(item.id, f) +
            renderFrameworkBlock(item.id) +
            renderCommentsBlock(item.id);

        detail.innerHTML = html;
    }

    function statusBtn(status, current) {
        var lbl = statusLabel(status);
        var cls = 'status-btn ' + status;
        if (status === current) cls += ' active';
        return '<button class="' + cls + '" data-set-status="' + status + '">' + lbl + '</button>';
    }
    function riskPill(level, current) {
        var cls = 'risk-pill ' + level;
        if (level === current) cls += ' active';
        return '<button class="' + cls + '" data-set-risk="' + level + '">' + level + '</button>';
    }
    function renderLifecycleBlock(itemId, finding) {
        if (!finding || finding.status !== 'fail') return '';
        var lc = finding.lifecycle || { state: 'open' };
        var state = lc.state || 'open';
        var html = '<div class="detail-section detail-lifecycle">' +
            '<div class="detail-label">Remediation lifecycle</div>' +
            '<div class="lifecycle-track">';
        var states = [
            { id: 'open',         label: 'Open' },
            { id: 'acknowledged', label: 'Acknowledged' },
            { id: 'remediating',  label: 'Remediating' },
            { id: 'verified',     label: 'Verified' }
        ];
        var activeIdx = -1;
        for (var i = 0; i < states.length; i++) if (states[i].id === state) { activeIdx = i; break; }
        for (var j = 0; j < states.length; j++) {
            var done = j <= activeIdx ? ' done' : '';
            var current = j === activeIdx ? ' current' : '';
            html += '<button class="lifecycle-step' + done + current + '" data-set-lifecycle="' + states[j].id + '" data-item-id="' + itemId + '">' +
                '<span class="lc-dot"></span><span class="lc-label">' + states[j].label + '</span></button>';
        }
        if (state === 'accepted') {
            html += '<button class="lifecycle-step accepted current" data-set-lifecycle="accepted" data-item-id="' + itemId + '">' +
                '<span class="lc-dot">' + svg('a-lock', 'icon-xs') + '</span><span class="lc-label">Accepted</span></button>';
        } else {
            html += '<button class="lifecycle-step alt" data-set-lifecycle="accepted" data-item-id="' + itemId + '" title="Customer-accepted risk">' +
                '<span class="lc-dot">' + svg('a-lock', 'icon-xs') + '</span><span class="lc-label">Accept risk</span></button>';
        }
        html += '</div>';

        if (state === 'remediating') {
            html += '<div class="lifecycle-fields">' +
                '<div class="lc-field"><label>Owner</label><input type="text" value="' + escape(lc.owner || '') + '"/></div>' +
                '<div class="lc-field"><label>Target date</label><input type="date" value="' + escape(lc.targetDate || '') + '"/></div>' +
            '</div>';
        } else if (state === 'accepted') {
            html += '<div class="lifecycle-fields lc-accepted">' +
                '<div class="lc-field lc-field-full"><label>Acceptance justification</label><textarea>' + escape(lc.justification || '') + '</textarea></div>' +
                '<div class="lc-field"><label>Signed by</label><input type="text" value="' + escape(lc.signedBy || '') + '"/></div>' +
                '<div class="lc-field"><label>Signed at</label><input type="date" value="' + escape(lc.signedAt || '') + '"/></div>' +
                '<div class="lc-field"><label>Expires</label><input type="date" value="' + escape(lc.expiresAt || '') + '"/></div>' +
            '</div>';
            var exp = acceptanceExpiringSoon(finding);
            if (exp) {
                if (exp.expired) {
                    html += '<div class="acc-expiry-banner expired">' +
                        svg('a-stale', 'icon-sm') +
                        '<div><strong>Acceptance expired ' + exp.days + ' day' + (exp.days === 1 ? '' : 's') + ' ago.</strong> ' +
                        'Re-validate the compensating control or move the finding back to Open.</div>' +
                    '</div>';
                } else {
                    html += '<div class="acc-expiry-banner warn">' +
                        svg('a-clock', 'icon-sm') +
                        '<div><strong>Acceptance expires in ' + exp.days + ' day' + (exp.days === 1 ? '' : 's') + '.</strong> ' +
                        'Schedule a renewal review with the signer (' + escape(lc.signedBy || 'unknown') + ').</div>' +
                    '</div>';
                }
            }
        } else if (state === 'verified') {
            html += '<div class="lifecycle-fields"><div class="lc-field lc-field-full" style="color:var(--success-text);font-size:12.5px"><strong>Verified fixed.</strong> Re-run the catalog check to confirm; finding will move to Pass.</div></div>';
        }

        if (finding.checkedAt) {
            var days = daysSince(finding.checkedAt);
            var staleClass = days > 90 ? ' stale' : '';
            html += '<div class="lifecycle-meta' + staleClass + '">' +
                svg('a-clock', 'icon-xs') +
                ' Last verified <strong>' + escape(finding.checkedAt) + '</strong>' +
                ' (' + days + ' day' + (days === 1 ? '' : 's') + ' ago)' +
                (days > 90 ? '<span class="badge badge-orange" style="margin-left:8px"><svg class="icon icon-xs" aria-hidden="true"><use href="#a-stale"/></svg> Stale</span>' : '') +
            '</div>';
        }
        html += '</div>';
        return html;
    }

    function renderFrameworkBlock(itemId) {
        var fm = FRAMEWORK_MAP[itemId];
        if (!fm) return '';
        var html = '<div class="detail-section detail-frameworks">' +
            '<div class="detail-label">Compliance mapping</div>' +
            '<div class="framework-chips">';
        if (fm.iso)  html += '<span class="framework-chip iso"><span class="fc-name">ISO 27001</span><span class="fc-id">' + escape(fm.iso) + '</span></span>';
        if (fm.cis)  html += '<span class="framework-chip cis"><span class="fc-name">CIS M365</span><span class="fc-id">' + escape(fm.cis) + '</span></span>';
        if (fm.nist) html += '<span class="framework-chip nist"><span class="fc-name">NIST CSF</span><span class="fc-id">' + escape(fm.nist) + '</span></span>';
        html += '</div></div>';
        return html;
    }

    function renderCommentsBlock(itemId) {
        var list = COMMENTS[itemId] || [];
        var html = '<div class="detail-comments">' +
            '<div class="detail-comments-header">' + svg('a-people', 'icon-sm') + ' Comments <span class="comment-count">' + list.length + '</span></div>';
        if (!list.length) {
            html += '<div class="comment-empty">No comments yet. Add a note for your team or the customer.</div>';
        } else {
            html += '<ul class="comment-list">';
            for (var i = 0; i < list.length; i++) {
                var c = list[i];
                var initials = (c.author || '?').replace(/[^A-Za-z]+/g, ' ').trim().split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
                html += '<li class="comment">' +
                    '<div class="comment-avatar">' + escape(initials) + '</div>' +
                    '<div class="comment-body">' +
                        '<div class="comment-meta"><strong>' + escape(c.author) + '</strong> &middot; <span>' + escape(c.date) + '</span></div>' +
                        '<div class="comment-text">' + escape(c.text) + '</div>' +
                    '</div>' +
                '</li>';
            }
            html += '</ul>';
        }
        html += '<div class="comment-compose">' +
            '<textarea placeholder="Add a comment&hellip;"></textarea>' +
            '<div class="comment-compose-actions"><button class="btn btn-secondary" style="padding:6px 10px;font-size:12px">Mention &commat;</button><button class="btn btn-primary" style="padding:6px 10px;font-size:12px">Post</button></div>' +
        '</div></div>';
        return html;
    }

    function renderEvidence(list, itemId) {
        var html = '';
        if (list && list.length) {
            html += '<div class="evidence-grid">';
            for (var i = 0; i < list.length; i++) {
                var name = list[i];
                var iconId = /\.(png|jpe?g|gif|webp|svg)$/i.test(name) ? 'a-evidence' :
                             /\.(csv|xlsx?)$/i.test(name) ? 'a-clipboard' :
                             /\.(json|txt|log|eml)$/i.test(name) ? 'a-doc' :
                                                                    'a-attach';
                html += '<div class="evidence-thumb" data-evidence-name="' + escape(name) + '">' +
                    '<div class="evidence-thumb-img">' + svg(iconId, 'icon-lg') + '</div>' +
                    '<div class="evidence-thumb-name" title="' + escape(name) + '">' + escape(name) + '</div>' +
                    '<button class="evidence-thumb-rm" data-act="evidence-rm" data-item-id="' + itemId + '" data-name="' + escape(name) + '" title="Remove">×</button>' +
                '</div>';
            }
            html += '</div>';
        }
        html += '<div class="evidence-dropzone" data-act="evidence-drop" data-item-id="' + itemId + '">' +
            svg('a-attach', 'icon-md') + ' <strong>Drop a file</strong> or click to attach evidence' +
            '<div class="evidence-dropzone-hint">Screenshots, CSV exports, JSON dumps, .eml files — anything that backs the finding</div>' +
        '</div>';
        return html;
    }

    /* ----- Reference catalog ---------------------------------- */

    function renderReference() {
        renderRefCategoryList();
        renderRefRows();
    }

    function renderRefCategoryList() {
        var ul = document.getElementById('ref-category-list');
        if (!ul) return;
        var html = '<li' + (state.refCategory === null ? ' class="active"' : '') + ' data-ref-cat="">' +
                   '<span class="cat-product">' + svg('n-reference', 'icon-md') + '</span>' +
                   '<span class="cat-name">All categories</span>' +
                   '<span class="cat-count">' + ITEMS.length + '</span></li>';
        for (var i = 0; i < CAT_INDEX.order.length; i++) {
            var name = CAT_INDEX.order[i];
            var n = CAT_INDEX.cats[name].items.length;
            var activeCls = state.refCategory === name ? ' class="active"' : '';
            html += '<li' + activeCls + ' data-ref-cat="' + escape(name) + '">' +
                    '<span class="cat-product">' + productIcon(name, 'icon-product') + '</span>' +
                    '<span class="cat-name">' + escape(name) + '</span>' +
                    '<span class="cat-count">' + n + '</span></li>';
        }
        ul.innerHTML = html;
    }

    function renderRefRows() {
        var tbody = document.getElementById('ref-tbody');
        var count = document.getElementById('ref-count');
        if (!tbody) return;
        var q = state.refSearch.toLowerCase();
        var rows = '';
        var shown = 0;
        var max = state.refLimit || 200;
        var totalMatches = 0;
        for (var i = 0; i < ITEMS.length; i++) {
            var it = ITEMS[i];
            if (state.refCategory && it.category !== state.refCategory) continue;
            if (q) {
                var hay = (it.description + ' ' + it.expected + ' ' + it.how + ' ' + it.perm).toLowerCase();
                if (hay.indexOf(q) === -1) continue;
            }
            totalMatches++;
            if (shown >= max) continue;
            rows +=
                '<tr>' +
                '<td>' + it.id + '</td>' +
                '<td><div style="display:flex;align-items:center;gap:6px">' +
                    productIcon(it.category, 'icon-product-sm') +
                    '<span style="font-weight:600;color:var(--primary);font-size:11.5px">' + escape(it.category) + '</span>' +
                '</div></td>' +
                '<td>' + escape(it.description) + '<div style="color:var(--text-muted);font-size:11.5px;margin-top:2px;font-family:var(--font-mono);">' + escape(truncate(it.how, 90)) + '</div></td>' +
                '<td>' + escape(truncate(it.expected, 90)) + '</td>' +
                '<td>' + escape(it.perm) + '</td>' +
                '</tr>';
            shown++;
        }
        tbody.innerHTML = rows || '<tr><td colspan="5"><div class="empty-state" style="padding:30px"><div class="empty-title">No matches</div><div class="empty-help">Try a different search or clear the category filter.</div></div></td></tr>';
        if (count) {
            var hidden = totalMatches - shown;
            count.innerHTML = 'Showing <strong>' + shown + '</strong> of <strong>' + totalMatches + '</strong>' +
                (hidden > 0 ? ' &middot; <button class="btn-link" data-action="ref-load-more">Load ' + Math.min(200, hidden) + ' more</button>' : '');
        }
    }

    /* ----- Helpers from helpers.js ---------------------------- */

    var H = window.SA;
    var svg            = H.svg;
    var productIconId  = H.productIconId;
    var productIcon    = H.productIcon;
    var statusIcon     = H.statusIcon;
    var statusBadgeClass = H.statusBadgeClass;
    var statusLabel    = H.statusLabel;
    var getPortal      = H.getPortal;
    var closestData    = H.closestData;
    var findAncestor   = H.findAncestor;

    function isPowerShellLike(s) {
        return /^\s*(Get-|Set-|New-|Remove-|az\s|Connect-|Invoke-|Start-|Stop-|Add-|Update-|Disable-|Enable-)/i.test(s || '');
    }

    function deriveScopes(perm) {
        if (!perm) return '';
        var matches = perm.match(/[A-Z][A-Za-z]+(?:\.[A-Z][A-Za-z]+)+/g);
        return matches ? matches.join('", "') : '';
    }

    function getPowerShellSnippet(item) {
        var how = (item.how || '').trim();
        var scopes = deriveScopes(item.perm);
        var lines = [];
        lines.push('# Item #' + item.id + ' — ' + item.category);
        lines.push('# ' + item.description);
        lines.push('# Expected: ' + (item.expected || '(not stated)'));
        lines.push('');
        if (scopes) {
            lines.push('# Connect to Microsoft Graph with the required scope');
            lines.push('Connect-MgGraph -Scopes "' + scopes + '"');
        } else {
            lines.push('# Required role / permission: ' + (item.perm || '(not stated)'));
            lines.push('Connect-MgGraph');
        }
        lines.push('');
        if (isPowerShellLike(how)) {
            lines.push('# Run the check');
            lines.push(how);
        } else if (/^Same as above/i.test(how)) {
            lines.push('# Same command pattern as the previous catalog item');
            lines.push('# (See item #' + (item.id - 1) + ')');
        } else {
            lines.push('# This check is performed via the portal:');
            lines.push('#   ' + how);
            lines.push('');
            lines.push('# Confirm tenant context:');
            lines.push('Get-MgContext');
        }
        return lines.join('\n');
    }

    function highlightPowerShell(code) {
        var html = escape(code);
        html = html.replace(/(^|\n)([^\n#]*)(#[^\n]*)/g, function (_, lead, before, comment) {
            return lead + before + '<span class="ps-comment">' + comment + '</span>';
        });
        html = html.replace(/\b(Connect-MgGraph|Get-Mg[A-Za-z]+|Set-Mg[A-Za-z]+|New-Mg[A-Za-z]+|Remove-Mg[A-Za-z]+|Get-MgContext|Get-AzureAD[A-Za-z]+|az [a-z][a-z\-]*)\b/g, '<span class="ps-cmd">$1</span>');
        html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="ps-str">$1</span>');
        html = html.replace(/(\s)(-[A-Za-z][A-Za-z0-9]+)\b/g, '$1<span class="ps-flag">$2</span>');
        return html;
    }

    function showPowerShellFor(itemId) {
        var item = ITEMS[itemId - 1];
        if (!item) return;
        document.getElementById('ps-modal-item').textContent = '#' + item.id + ' ' + item.description;
        var meta = document.getElementById('ps-modal-meta');
        meta.innerHTML =
            '<div class="ps-meta-row"><span class="ps-meta-label">Category</span><span class="ps-meta-value">' + escape(item.category) + '</span></div>' +
            '<div class="ps-meta-row"><span class="ps-meta-label">Expected</span><span class="ps-meta-value">' + escape(item.expected) + '</span></div>' +
            '<div class="ps-meta-row"><span class="ps-meta-label">Permission</span><span class="ps-meta-value"><code>' + escape(item.perm) + '</code></span></div>';
        var code = getPowerShellSnippet(item);
        document.getElementById('ps-modal-code').innerHTML = highlightPowerShell(code);
        document.getElementById('ps-modal-code').dataset.raw = code;
        openModal('modal-powershell');
    }

    function openPortalFor(itemId) {
        var item = ITEMS[itemId - 1];
        if (!item) return;
        var p = getPortal(item);
        window.open(p.url, '_blank', 'noopener');
    }

    function copyPowerShell() {
        var code = document.getElementById('ps-modal-code').dataset.raw || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(function () {
                flashFooter('Copied to clipboard.');
            });
        } else {
            var ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); flashFooter('Copied to clipboard.'); } catch (e) {}
            document.body.removeChild(ta);
        }
    }

    function toggleTheme() {
        var html = document.documentElement;
        var dark = html.classList.toggle('theme-dark');
        var label = document.getElementById('theme-label');
        if (label) label.textContent = dark ? 'Light' : 'Dark';
    }

    function applyInitialTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('theme-dark');
            var label = document.getElementById('theme-label');
            if (label) label.textContent = 'Light';
        }
    }

    function triggerAIAssist(kind, itemId, btn) {
        var item = ITEMS[itemId - 1];
        if (!item) return;
        var pid = productIconId(item.category);
        var bank = kind === 'ai-remediation' ? LLM_REMEDIATION : LLM_TRANSLATION;
        var text = bank[pid] || bank['default'];

        var targetField = kind === 'ai-remediation' ? 'remediation' : 'observation';
        var ta = document.querySelector('textarea[data-textarea="' + targetField + '"][data-item-id="' + itemId + '"]');
        if (!ta) return;

        btn.classList.add('ai-thinking');
        btn.disabled = true;
        var origLabel = btn.innerHTML;
        btn.innerHTML = svg('a-sparkle', 'icon-xs') + ' Drafting&hellip;';

        var existingPreview = ta.parentNode.querySelector('.ai-preview');
        if (existingPreview) existingPreview.remove();

        setTimeout(function () {
            var preview = document.createElement('div');
            preview.className = 'ai-preview';
            preview.innerHTML =
                '<div class="ai-preview-head">' +
                    svg('a-sparkle', 'icon-xs') +
                    '<span class="ai-preview-title">AI ' + (kind === 'ai-remediation' ? 'remediation draft' : 'customer translation') + '</span>' +
                    '<button class="btn-link ai-preview-action" data-act="ai-apply" data-item-id="' + itemId + '" data-target="' + targetField + '">Apply</button>' +
                    '<button class="btn-link ai-preview-action" data-act="ai-regenerate" data-item-id="' + itemId + '" data-kind="' + kind + '">Regenerate</button>' +
                    '<button class="btn-link ai-preview-action" data-act="ai-dismiss">Dismiss</button>' +
                '</div>' +
                '<div class="ai-preview-text" data-ai-text>' + escape(text) + '</div>';
            ta.parentNode.insertBefore(preview, ta.nextSibling);
            btn.classList.remove('ai-thinking');
            btn.disabled = false;
            btn.innerHTML = origLabel;
        }, 850);
    }

    /* AI preview Apply / Regenerate / Dismiss */
    document.addEventListener('click', function (e) {
        var t = e.target;
        var act = closestData(t, 'act');
        if (act === 'ai-apply') {
            var btn = findAncestor(t, function (el) { return el.dataset && el.dataset.act === 'ai-apply'; });
            var iid = parseInt(btn.dataset.itemId, 10);
            var target = btn.dataset.target;
            var preview = findAncestor(btn, function (el) { return el.classList && el.classList.contains('ai-preview'); });
            var txt = preview.querySelector('[data-ai-text]').textContent;
            var ta = document.querySelector('textarea[data-textarea="' + target + '"][data-item-id="' + iid + '"]');
            if (ta) ta.value = txt;
            FINDINGS[iid] = FINDINGS[iid] || { status: 'fail', risk: 'med' };
            FINDINGS[iid][target] = txt;
            preview.remove();
            flashFooter(target === 'remediation' ? 'Remediation drafted by AI.' : 'Observation rewritten for customer.');
        } else if (act === 'ai-regenerate') {
            var btn2 = findAncestor(t, function (el) { return el.dataset && el.dataset.act === 'ai-regenerate'; });
            var iid2 = parseInt(btn2.dataset.itemId, 10);
            var kind = btn2.dataset.kind;
            var preview2 = findAncestor(btn2, function (el) { return el.classList && el.classList.contains('ai-preview'); });
            preview2.remove();
            var origBtn = document.querySelector('button[data-act="' + kind + '"][data-item-id="' + iid2 + '"]');
            if (origBtn) triggerAIAssist(kind, iid2, origBtn);
        } else if (act === 'ai-dismiss') {
            var preview3 = findAncestor(t, function (el) { return el.classList && el.classList.contains('ai-preview'); });
            if (preview3) preview3.remove();
        }
    });

    function flashFooter(msg) {
        var f = document.querySelector('.app-statusbar');
        if (!f) return;
        var prev = f.dataset.prev || f.innerHTML;
        f.dataset.prev = prev;
        f.innerHTML = '<span class="pill-dot pill-dot-on"></span> ' + escape(msg);
        setTimeout(function () { f.innerHTML = prev; f.dataset.prev = ''; }, 2400);
    }

    /* ----- Audit status report -------------------------------- */

    var ACTIVE_AUDIT = AUDITS[0]; /* always first audit in this mockup */

    function computeAuditStats() {
        var byCat = [];
        var totals = { items: ITEMS.length, pass: 0, fail: 0, na: 0, pending: 0, high: 0, med: 0, low: 0 };
        for (var i = 0; i < CAT_INDEX.order.length; i++) {
            var name = CAT_INDEX.order[i];
            var c = CAT_INDEX.cats[name];
            byCat.push({ name: name, items: c.items.length, pass: c.pass, fail: c.fail, na: c.na, pending: c.pending });
            totals.pass += c.pass; totals.fail += c.fail; totals.na += c.na; totals.pending += c.pending;
        }
        for (var k in FINDINGS) {
            if (!FINDINGS.hasOwnProperty(k)) continue;
            var r = FINDINGS[k].risk;
            if (r === 'high') totals.high++;
            else if (r === 'med') totals.med++;
            else if (r === 'low') totals.low++;
        }
        return { totals: totals, byCat: byCat };
    }

    function renderAuditReport() {
        var a = ACTIVE_AUDIT;
        var s = computeAuditStats();
        var t = s.totals;
        var checked = t.pass + t.fail + t.na;
        var pct = (checked / t.items * 100).toFixed(1);

        var html = '';
        var acceptedCount = 0;
        for (var lk in FINDINGS) {
            if (!FINDINGS.hasOwnProperty(lk)) continue;
            if (FINDINGS[lk].lifecycle && FINDINGS[lk].lifecycle.state === 'accepted') acceptedCount++;
        }

        html += '<div class="ar-cover">' +
            '<div class="ar-cover-text">' +
                '<div class="ar-eyebrow">Audit status report &middot; ' + new Date().toISOString().slice(0, 10) + '</div>' +
                '<h2 class="ar-title">' + escape(a.customer) + '</h2>' +
                '<div class="ar-meta">' +
                    '<span class="ar-meta-item"><strong>Tenant</strong> &middot; <code style="color:#aee0d6">' + escape(a.tenant) + '</code></span>' +
                    '<span class="ar-meta-item"><strong>Reviewer</strong> &middot; peter@kalmstrom.com</span>' +
                    '<span class="ar-meta-item"><strong>Started</strong> &middot; ' + escape(a.started) + '</span>' +
                    '<span class="ar-meta-item"><strong>Status</strong> &middot; <span class="badge ' + a.badge + '">' + escape(a.status) + '</span></span>' +
                '</div>' +
                '<div class="ar-cover-risk" id="ar-cover-risk">' +
                    '<div class="arc-tile high"><div class="arc-tile-num">' + t.high + '</div><div class="arc-tile-lbl">High risk</div></div>' +
                    '<div class="arc-tile med"><div class="arc-tile-num">' + t.med + '</div><div class="arc-tile-lbl">Medium risk</div></div>' +
                    '<div class="arc-tile low"><div class="arc-tile-num">' + t.low + '</div><div class="arc-tile-lbl">Low risk</div></div>' +
                    '<div class="arc-tile acc"><div class="arc-tile-num">' + acceptedCount + '</div><div class="arc-tile-lbl">Accepted</div></div>' +
                '</div>' +
            '</div>' +
            '<div class="ar-cover-illustration"><svg viewBox="0 0 200 80" preserveAspectRatio="xMidYMid meet"><use href="#ill-audit-hero"/></svg></div>' +
        '</div>';

        html += '<div class="ar-section"><h3>Overall progress</h3>' + renderArProgress(t, checked, pct) + '</div>';
        html += '<div class="ar-section"><h3>Tenant posture heatmap</h3><div id="ar-heatmap-host"></div></div>';
        html += '<div class="ar-section"><h3>Findings by category</h3>' + renderArCategoryTable(s.byCat) + '</div>';
        html += '<div class="ar-section">' +
            '<div class="ar-section-toolbar">' +
                '<h3 style="margin:0">Recorded findings</h3>' +
                '<div class="ar-filter-chips" id="ar-filter-chips">' +
                    arChip('all',  'All') +
                    arChip('fail', 'Failures only') +
                    arChip('high', 'High risk') +
                    arChip('med',  'Medium risk') +
                    arChip('low',  'Low risk') +
                    arChip('accepted', 'Accepted') +
                    arChip('pass', 'Passes') +
                    arChip('na',   'N/A') +
                '</div>' +
            '</div>' +
            '<div id="ar-findings-host">' + renderArFindings(state.reportFilter) + '</div>' +
        '</div>';
        html += '<div class="ar-section"><h3>Pending items (' + t.pending + ')</h3>' + renderArPending() + '</div>';

        document.getElementById('audit-report-body').innerHTML = html;
        renderHeatmap('ar-heatmap-host');
    }

    function renderArProgress(t, checked, pct) {
        var w = function (n) { return (n / t.items * 100).toFixed(2) + '%'; };
        var html = '';
        html += '<div class="ar-kpi-row">' +
            '<div class="ar-kpi info"><div class="ar-kpi-label">Coverage</div><div class="ar-kpi-value">' + pct + '%</div><div class="ar-kpi-sub">' + checked + ' / ' + t.items + ' items</div></div>' +
            '<div class="ar-kpi"><div class="ar-kpi-label">Pass</div><div class="ar-kpi-value">' + t.pass + '</div></div>' +
            '<div class="ar-kpi fail"><div class="ar-kpi-label">Fail</div><div class="ar-kpi-value">' + t.fail + '</div></div>' +
            '<div class="ar-kpi pending"><div class="ar-kpi-label">N/A</div><div class="ar-kpi-value">' + t.na + '</div></div>' +
            '<div class="ar-kpi pending"><div class="ar-kpi-label">Pending</div><div class="ar-kpi-value">' + t.pending + '</div></div>' +
        '</div>';
        html += '<div style="margin-top:14px">';
        html += '<div class="ar-stack">' +
            '<div class="ar-stack-pass" style="width:' + w(t.pass) + '"></div>' +
            '<div class="ar-stack-fail" style="width:' + w(t.fail) + '"></div>' +
            '<div class="ar-stack-na"   style="width:' + w(t.na)   + '"></div>' +
            '<div class="ar-stack-pending" style="width:' + w(t.pending) + '"></div>' +
        '</div>';
        html += '<div class="ar-stack-legend">' +
            '<span><span class="swatch" style="background:var(--accent-green)"></span>Pass (' + t.pass + ')</span>' +
            '<span><span class="swatch" style="background:var(--accent-red)"></span>Fail (' + t.fail + ')</span>' +
            '<span><span class="swatch" style="background:var(--neutral-text)"></span>N/A (' + t.na + ')</span>' +
            '<span><span class="swatch" style="background:var(--border-strong)"></span>Pending (' + t.pending + ')</span>' +
        '</div>';
        html += '</div>';
        html += renderRiskDonut(t);
        return html;
    }

    function renderRiskDonut(t) {
        var totalRisk = t.high + t.med + t.low;
        var c = 2 * Math.PI * 50;
        var passLen = totalRisk ? (t.low / totalRisk) * c : 0;
        var medLen  = totalRisk ? (t.med / totalRisk) * c : 0;
        var failLen = totalRisk ? (t.high / totalRisk) * c : 0;

        var passDash = passLen + ' ' + (c - passLen);
        var medDash  = medLen + ' ' + (c - medLen);
        var failDash = failLen + ' ' + (c - failLen);

        var medOff  = -passLen;
        var failOff = -(passLen + medLen);

        var html = '<div style="margin-top:18px"><h3 style="margin-bottom:14px">Risk distribution</h3>';
        html += '<div class="donut-row">';
        html += '<div class="donut-wrap donut">' +
            '<svg viewBox="0 0 120 120">' +
                '<circle class="donut-track" cx="60" cy="60" r="50"/>' +
                '<circle class="donut-seg" cx="60" cy="60" r="50" stroke="#02B896" stroke-dasharray="' + passDash + '"/>' +
                '<circle class="donut-seg" cx="60" cy="60" r="50" stroke="#F5A623" stroke-dasharray="' + medDash + '" stroke-dashoffset="' + medOff + '"/>' +
                '<circle class="donut-seg" cx="60" cy="60" r="50" stroke="#B55852" stroke-dasharray="' + failDash + '" stroke-dashoffset="' + failOff + '"/>' +
            '</svg>' +
            '<div class="donut-label">' +
                '<div class="donut-num">' + totalRisk + '</div>' +
                '<div class="donut-cap">Findings</div>' +
            '</div>' +
        '</div>';
        html += '<div class="donut-legend">' +
            '<div class="donut-legend-row"><span class="donut-swatch" style="background:#B55852"></span>' +
                '<span class="donut-name">High risk</span><span class="donut-meta">≤ 30 days</span><span class="donut-count">' + t.high + '</span></div>' +
            '<div class="donut-legend-row"><span class="donut-swatch" style="background:#F5A623"></span>' +
                '<span class="donut-name">Medium risk</span><span class="donut-meta">≤ 90 days</span><span class="donut-count">' + t.med + '</span></div>' +
            '<div class="donut-legend-row"><span class="donut-swatch" style="background:#02B896"></span>' +
                '<span class="donut-name">Low risk</span><span class="donut-meta">backlog</span><span class="donut-count">' + t.low + '</span></div>' +
        '</div>';
        html += '</div></div>';
        return html;
    }

    function severityCountsForCategory(catName) {
        var cat = CAT_INDEX.cats[catName];
        if (!cat) return { high: 0, med: 0, low: 0 };
        var counts = { high: 0, med: 0, low: 0 };
        for (var i = 0; i < cat.items.length; i++) {
            var f = FINDINGS[cat.items[i].id];
            if (f && f.status === 'fail') {
                if (f.risk === 'high') counts.high++;
                else if (f.risk === 'med') counts.med++;
                else if (f.risk === 'low') counts.low++;
            }
        }
        return counts;
    }

    function severityMiniBar(catName) {
        var s = severityCountsForCategory(catName);
        var total = s.high + s.med + s.low;
        if (!total) return '<span class="text-muted" style="font-size:10.5px">—</span>';
        var w = function (n) { return (n / total * 100).toFixed(1) + '%'; };
        return '<span class="ar-severity-bar" title="' + s.high + ' high · ' + s.med + ' med · ' + s.low + ' low">' +
            '<span class="sev-high" style="width:' + w(s.high) + '"></span>' +
            '<span class="sev-med"  style="width:' + w(s.med)  + '"></span>' +
            '<span class="sev-low"  style="width:' + w(s.low)  + '"></span>' +
        '</span>';
    }

    function renderArCategoryTable(byCat) {
        var html = '<table class="ar-cat-table"><thead><tr>' +
            '<th>Category</th><th class="num">Items</th><th class="num">Pass</th><th class="num">Fail</th><th class="num">N/A</th><th class="num">Pending</th><th>Progress</th><th>Severity mix</th><th>Trend</th><th>vs portfolio</th>' +
            '</tr></thead><tbody>';
        for (var i = 0; i < byCat.length; i++) {
            var c = byCat[i];
            var done = c.pass + c.fail + c.na;
            var pct = (done / c.items * 100).toFixed(0);
            html += '<tr>' +
                '<td class="ar-cat-name"><span style="display:inline-flex;align-items:center;gap:6px">' +
                    productIcon(c.name, 'icon-product-sm') +
                    '<span>' + escape(c.name) + '</span>' +
                '</span></td>' +
                '<td class="num">' + c.items + '</td>' +
                '<td class="num"' + (c.pass ? ' style="color:var(--success-text);font-weight:700"' : '') + '>' + c.pass + '</td>' +
                '<td class="num"' + (c.fail ? ' style="color:var(--accent-red);font-weight:700"' : '') + '>' + c.fail + '</td>' +
                '<td class="num">' + c.na + '</td>' +
                '<td class="num">' + c.pending + '</td>' +
                '<td><span class="ar-cat-progress"><span class="ar-cat-progress-fill" style="width:' + pct + '%"></span></span>' + pct + '%</td>' +
                '<td>' + severityMiniBar(c.name) + '</td>' +
                '<td>' + sparkline(c.name) + '</td>' +
                '<td>' + benchmarkBar(c.name) + '</td>' +
            '</tr>';
        }
        html += '</tbody></table>';
        return html;
    }

    function sparkline(categoryName) {
        var data = TREND_DATA[categoryName];
        if (!data || !data.length) return '<span class="text-muted" style="font-size:10.5px">no history</span>';
        var w = 70, h = 22, pad = 2;
        var max = 100, min = 0;
        var step = (w - pad * 2) / (data.length - 1);
        var pts = '';
        for (var i = 0; i < data.length; i++) {
            var x = pad + i * step;
            var y = h - pad - ((data[i] - min) / (max - min)) * (h - pad * 2);
            pts += (i ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        var lastY = h - pad - ((data[data.length - 1] - min) / (max - min)) * (h - pad * 2);
        var lastX = pad + (data.length - 1) * step;
        var trend = data[data.length - 1] - data[0];
        var color = trend >= 0 ? '#02B896' : '#B55852';
        return '<svg class="sparkline" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
            '<path d="' + pts + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
            '<circle cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="2" fill="' + color + '"/>' +
            '<title>' + data.join('% → ') + '%</title>' +
        '</svg>';
    }

    function arChip(value, label) {
        var active = (state.reportFilter || 'all') === value ? ' active' : '';
        return '<button class="filter-chip' + active + '" data-ar-filter="' + value + '">' + label + '</button>';
    }

    function renderArFindings(filter) {
        filter = filter || 'all';
        var groups = {};
        var order = [];
        var matched = 0;
        for (var k in FINDINGS) {
            if (!FINDINGS.hasOwnProperty(k)) continue;
            var f = FINDINGS[k];
            if (filter === 'fail' && f.status !== 'fail') continue;
            if (filter === 'high' && (f.status !== 'fail' || f.risk !== 'high')) continue;
            if (filter === 'med'  && (f.status !== 'fail' || f.risk !== 'med')) continue;
            if (filter === 'low'  && (f.status !== 'fail' || f.risk !== 'low')) continue;
            if (filter === 'accepted' && (!f.lifecycle || f.lifecycle.state !== 'accepted')) continue;
            if (filter === 'pass' && f.status !== 'pass') continue;
            if (filter === 'na'   && f.status !== 'na') continue;
            var item = ITEMS[Number(k) - 1];
            if (!item) continue;
            if (!groups[item.category]) { groups[item.category] = []; order.push(item.category); }
            groups[item.category].push({ item: item, finding: f });
            matched++;
        }
        if (!order.length) return '<div class="text-muted" style="padding:12px 0">No findings match this filter.</div>';

        var html = '';
        for (var i = 0; i < order.length; i++) {
            var cat = order[i];
            html += '<div class="ar-finding-cat-header">' + productIcon(cat, 'icon-product-sm') + '<span>' + escape(cat) + '</span></div>';
            for (var j = 0; j < groups[cat].length; j++) {
                var entry = groups[cat][j];
                var f = entry.finding;
                var item = entry.item;
                var statusCls = f.status + (f.status === 'fail' && f.risk && f.risk !== 'none' ? ' risk-' + f.risk : '');
                var riskBadge = f.risk === 'high' ? 'badge-red' : f.risk === 'med' ? 'badge-orange' : f.risk === 'low' ? 'badge-teal' : 'badge-gray';
                var glyph = H.riskGlyph(f.risk);
                var fm = FRAMEWORK_MAP[item.id];
                var fmHtml = '';
                if (fm) {
                    fmHtml = '<div class="framework-chips" style="margin-top:6px">';
                    if (fm.iso)  fmHtml += '<span class="framework-chip iso"><span class="fc-name">ISO 27001</span><span class="fc-id">' + escape(fm.iso) + '</span></span>';
                    if (fm.cis)  fmHtml += '<span class="framework-chip cis"><span class="fc-name">CIS M365</span><span class="fc-id">' + escape(fm.cis) + '</span></span>';
                    if (fm.nist) fmHtml += '<span class="framework-chip nist"><span class="fc-name">NIST CSF</span><span class="fc-id">' + escape(fm.nist) + '</span></span>';
                    fmHtml += '</div>';
                }
                html += '<div class="ar-finding ' + statusCls + '">' +
                    '<div class="ar-finding-head">' +
                        '<span class="ar-finding-id">#' + item.id + '</span>' +
                        '<span class="ar-finding-title">' + escape(item.description) + '</span>' +
                        '<span class="badge ' + statusBadgeClass(f.status) + '">' + statusLabel(f.status) + '</span>' +
                        (f.risk && f.risk !== 'none' ? ' <span class="badge ' + riskBadge + ' badge-fail-risk" data-glyph="' + glyph + '">' + f.risk.toUpperCase() + ' risk</span>' : '') +
                    '</div>' +
                    (f.observation ? '<div class="ar-finding-obs">' + escape(f.observation) + '</div>' : '') +
                    (f.evidence && f.evidence.length ? '<div class="ar-finding-evidence">' + f.evidence.map(escape).join(' &middot; ') + '</div>' : '') +
                    fmHtml +
                '</div>';
            }
        }
        return html;
    }

    function renderArPending() {
        var groups = {};
        for (var i = 0; i < ITEMS.length; i++) {
            var it = ITEMS[i];
            if (FINDINGS[it.id]) continue;
            if (!groups[it.category]) groups[it.category] = [];
            groups[it.category].push(it);
        }
        var keys = Object.keys(groups).sort();
        if (!keys.length) return '<div class="text-muted">No pending items &mdash; well done.</div>';
        var html = '<ul class="ar-pending-list">';
        var shown = 0;
        var maxShown = 60;
        for (var k = 0; k < keys.length && shown < maxShown; k++) {
            var arr = groups[keys[k]];
            for (var j = 0; j < arr.length && shown < maxShown; j++) {
                html += '<li><span class="ar-pending-cat">' + escape(keys[k]) + '</span><br>' +
                    '#' + arr[j].id + ' &middot; ' + escape(truncate(arr[j].description, 70)) + '</li>';
                shown++;
            }
        }
        html += '</ul>';
        var totalPending = ITEMS.length - Object.keys(FINDINGS).length;
        if (totalPending > maxShown) {
            html += '<div class="text-muted" style="font-size:12px;margin-top:6px">Showing first ' + maxShown + ' of ' + totalPending + ' pending items.</div>';
        }
        return html;
    }

    /* ----- Compare with previous audit ------------------------ */

    function diffFindings(curr, prev) {
        var rows = [];
        var seen = {};
        for (var k in curr) if (curr.hasOwnProperty(k)) seen[k] = true;
        for (var k2 in prev) if (prev.hasOwnProperty(k2)) seen[k2] = true;
        var ids = Object.keys(seen).sort(function (a, b) { return Number(a) - Number(b); });
        for (var i = 0; i < ids.length; i++) {
            var id = parseInt(ids[i], 10);
            var c = curr[id], p = prev[id];
            var change;
            if (!p && !c) continue;
            if (!p && c)  change = c.status === 'fail' ? 'new-fail' : 'new-pass';
            else if (!c && p) change = 'now-pending';
            else if (p.status === 'fail' && c.status === 'pass') change = 'fixed';
            else if (p.status === 'fail' && c.status === 'na')   change = 'fixed';
            else if (p.status === 'pass' && c.status === 'fail') change = 'regressed';
            else if (p.status === c.status) change = 'same';
            else change = 'changed';
            rows.push({ id: id, prev: p, curr: c, change: change });
        }
        return rows;
    }

    function summarizeDiff(rows) {
        var s = { fixed: 0, regressed: 0, newFail: 0, newPass: 0, same: 0, changed: 0, nowPending: 0 };
        for (var i = 0; i < rows.length; i++) {
            var k = rows[i].change;
            if (k === 'fixed') s.fixed++;
            else if (k === 'regressed') s.regressed++;
            else if (k === 'new-fail') s.newFail++;
            else if (k === 'new-pass') s.newPass++;
            else if (k === 'now-pending') s.nowPending++;
            else if (k === 'same') s.same++;
            else s.changed++;
        }
        return s;
    }

    function renderCompareView() {
        var prevAudit = AUDITS.filter(function (a) { return a.id === ACTIVE_AUDIT.previousAuditId; })[0];
        var host = document.getElementById('compare-body');
        if (!host) return;
        if (!prevAudit) {
            host.innerHTML = '<div class="empty-state" style="padding:60px"><div class="empty-title">No previous audit</div><div class="empty-help">This is the first audit for this customer. Comparison becomes available after the second.</div></div>';
            return;
        }
        var rows = diffFindings(FINDINGS, PREV_FINDINGS);
        var s = summarizeDiff(rows);
        var html = '';
        html += '<div class="cmp-cover">' +
            '<div class="cmp-cover-text">' +
                '<div class="ar-eyebrow">Audit comparison</div>' +
                '<h2 class="ar-title">' + escape(ACTIVE_AUDIT.customer) + '</h2>' +
                '<div class="ar-meta">' +
                    '<span class="ar-meta-item"><strong>Current</strong> &middot; ' + escape(ACTIVE_AUDIT.started) + ' (catalog ' + escape(ACTIVE_AUDIT.catalogVersion) + ')</span>' +
                    '<span class="ar-meta-item"><strong>Previous</strong> &middot; ' + escape(prevAudit.started) + ' (catalog ' + escape(prevAudit.catalogVersion) + ')</span>' +
                '</div>' +
            '</div>' +
        '</div>';

        html += '<div class="ar-section"><h3>Year-over-year summary</h3>';
        html += '<div class="cmp-kpi-row">' +
            cmpKpi('green', 'Fixed', s.fixed, 'fail → pass / N/A') +
            cmpKpi('red',   'Regressed', s.regressed, 'pass → fail') +
            cmpKpi('warn',  'New failures', s.newFail, 'not in previous') +
            cmpKpi('info',  'New passes', s.newPass, 'not in previous') +
            cmpKpi('gray',  'Unchanged', s.same, 'same status') +
        '</div></div>';

        html += '<div class="ar-section"><h3>What changed</h3>';
        var groups = ['regressed', 'fixed', 'new-fail', 'new-pass', 'changed'];
        var labels = { regressed: 'Regressions', fixed: 'Fixed', 'new-fail': 'New failures (this audit)', 'new-pass': 'New passes', changed: 'Other status changes' };
        for (var g = 0; g < groups.length; g++) {
            var grp = groups[g];
            var subset = rows.filter(function (r) { return r.change === grp; });
            if (!subset.length) continue;
            html += '<div class="cmp-group cmp-group-' + grp + '">' +
                '<div class="cmp-group-title">' + labels[grp] + ' <span class="cmp-group-count">' + subset.length + '</span></div>' +
                '<ul class="cmp-list">';
            for (var i = 0; i < subset.length; i++) {
                var r = subset[i];
                var item = ITEMS[r.id - 1];
                if (!item) continue;
                html += '<li>' +
                    productIcon(item.category, 'icon-product-sm') +
                    '<span class="cmp-id">#' + r.id + '</span>' +
                    '<span class="cmp-text">' + escape(item.description) + '</span>' +
                    cmpBadgePair(r) +
                '</li>';
            }
            html += '</ul></div>';
        }
        html += '</div>';
        host.innerHTML = html;
    }

    function cmpKpi(tone, label, value, sub) {
        return '<div class="ar-kpi ' + tone + '"><div class="ar-kpi-label">' + label + '</div><div class="ar-kpi-value">' + value + '</div><div class="ar-kpi-sub">' + sub + '</div></div>';
    }

    function cmpBadgePair(row) {
        var p = row.prev ? '<span class="badge ' + statusBadgeClass(row.prev.status) + '">' + statusLabel(row.prev.status) + '</span>' : '<span class="badge badge-gray">—</span>';
        var c = row.curr ? '<span class="badge ' + statusBadgeClass(row.curr.status) + '">' + statusLabel(row.curr.status) + '</span>' : '<span class="badge badge-gray">—</span>';
        return '<span class="cmp-badge-pair">' + p + ' <span class="cmp-arrow">&rarr;</span> ' + c + '</span>';
    }

    /* ----- Helpers ------------------------------------------- */

    var escape = H.escape;
    var truncate = H.truncate;

    /* ----- Modal control -------------------------------------- */

    var modalReturnFocus = null;

    function focusableIn(el) {
        if (!el) return [];
        var sel = 'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        var nodes = el.querySelectorAll(sel);
        var visible = [];
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].offsetParent !== null) visible.push(nodes[i]);
        }
        return visible;
    }

    function openModal(id) {
        var m = document.getElementById(id);
        if (!m) return;
        modalReturnFocus = document.activeElement;
        m.removeAttribute('hidden');
        setTimeout(function () {
            var f = focusableIn(m);
            if (f.length) f[0].focus();
        }, 50);
    }
    function closeAllModals() {
        var ms = document.querySelectorAll('.modal-backdrop');
        var anyOpen = false;
        for (var i = 0; i < ms.length; i++) {
            if (!ms[i].hasAttribute('hidden')) { anyOpen = true; ms[i].setAttribute('hidden', ''); }
        }
        if (anyOpen && modalReturnFocus && modalReturnFocus.focus) {
            try { modalReturnFocus.focus(); } catch (e) {}
            modalReturnFocus = null;
        }
    }

    /* Focus trap inside any open modal */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab') return;
        var openModalEl = null;
        var ms = document.querySelectorAll('.modal-backdrop');
        for (var i = 0; i < ms.length; i++) {
            if (!ms[i].hasAttribute('hidden')) { openModalEl = ms[i]; break; }
        }
        if (!openModalEl) return;
        var f = focusableIn(openModalEl);
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    });

    /* ----- Event delegation ----------------------------------- */

    document.addEventListener('click', function (e) {
        var t = e.target;
        var nav = closestData(t, 'nav');
        if (nav) { show(nav); return; }

        var actBtn = closestData(t, 'act');
        if (actBtn === 'ps' || actBtn === 'portal') {
            var btn = findAncestor(t, function (el) { return el.dataset && el.dataset.act === actBtn; });
            var iid = parseInt(btn.dataset.itemId, 10);
            if (actBtn === 'ps')     showPowerShellFor(iid);
            if (actBtn === 'portal') openPortalFor(iid);
            e.stopPropagation();
            return;
        }
        if (actBtn === 'ai-remediation' || actBtn === 'ai-translate') {
            var aBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.act === actBtn; });
            var aid = parseInt(aBtn.dataset.itemId, 10);
            triggerAIAssist(actBtn, aid, aBtn);
            e.stopPropagation();
            return;
        }
        if (actBtn === 'check') {
            var lbl = findAncestor(t, function (el) { return el.dataset && el.dataset.act === 'check'; });
            var cid = parseInt(lbl.dataset.itemId, 10);
            if (state.selectedIds[cid]) delete state.selectedIds[cid];
            else state.selectedIds[cid] = true;
            renderItemList();
            e.stopPropagation();
            return;
        }

        var bulk = closestData(t, 'bulk');
        if (bulk) {
            if (bulk === 'clear') { clearSelection(); renderItemList(); return; }
            if (bulk === 'select-all') {
                var lis = document.querySelectorAll('#item-list li[data-item-id]');
                for (var b = 0; b < lis.length; b++) state.selectedIds[parseInt(lis[b].dataset.itemId, 10)] = true;
                renderItemList();
                return;
            }
            if (bulk === 'pass' || bulk === 'na') { applyBulk(bulk); return; }
            if (bulk === 'fail')      { applyBulk('fail');         return; } /* legacy default */
            if (bulk === 'fail-high') { applyBulk('fail', 'high'); return; }
            if (bulk === 'fail-med')  { applyBulk('fail', 'med');  return; }
            if (bulk === 'fail-low')  { applyBulk('fail', 'low');  return; }
            if (bulk === 'assign')    {
                var btnEl = findAncestor(t, function (el) { return el.dataset && el.dataset.bulk === 'assign'; });
                openSlaPopover(btnEl);
                return;
            }
        }

        /* Risk filter chips */
        var riskAttr = closestData(t, 'risk');
        if (riskAttr && findAncestor(t, function (el) { return el.id === 'risk-filter-row'; })) {
            var rfBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.risk; });
            state.riskFilter = rfBtn.dataset.risk;
            var rfChips = document.querySelectorAll('#risk-filter-row .filter-chip');
            for (var rfi = 0; rfi < rfChips.length; rfi++) rfChips[rfi].classList.toggle('active', rfChips[rfi] === rfBtn);
            renderItemList();
            return;
        }

        /* Tenant filter chips */
        var tenantAttr = closestData(t, 'tenant');
        if (tenantAttr && findAncestor(t, function (el) { return el.id === 'tenant-filter-row'; })) {
            var tfBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.tenant; });
            state.tenantFilter = tfBtn.dataset.tenant;
            var tfChips = document.querySelectorAll('#tenant-filter-row .filter-chip');
            for (var tfi = 0; tfi < tfChips.length; tfi++) tfChips[tfi].classList.toggle('active', tfChips[tfi] === tfBtn);
            renderItemList();
            return;
        }

        /* Bulk SLA popover internal buttons */
        if (t.matches && t.matches('[data-bsp-cancel]')) { closeSlaPopover(); return; }
        if (t.matches && t.matches('[data-bsp-apply]'))  { applySlaToSelection(); return; }

        /* Evidence remove */
        if (actBtn === 'evidence-rm') {
            var rmBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.act === 'evidence-rm'; });
            if (rmBtn) {
                var iidRm = parseInt(rmBtn.dataset.itemId, 10);
                removeEvidence(iidRm, rmBtn.dataset.name);
            }
            e.stopPropagation();
            return;
        }
        /* Evidence dropzone click → simulate file pick (mockup) */
        if (actBtn === 'evidence-drop') {
            var dz = findAncestor(t, function (el) { return el.dataset && el.dataset.act === 'evidence-drop'; });
            if (dz) {
                var iidD = parseInt(dz.dataset.itemId, 10);
                var stamp = new Date().toISOString().slice(0, 10);
                attachEvidence(iidD, 'screenshot-' + stamp + '-' + Math.random().toString(36).slice(2, 6) + '.png');
            }
            return;
        }

        /* Command palette result click */
        var cmdRow = findAncestor(t, function (el) { return el.classList && el.classList.contains('cmd-result'); });
        if (cmdRow) {
            var idx = parseInt(cmdRow.dataset.cmdIdx, 10);
            jumpFromCmd(CMD_RESULTS[idx]);
            return;
        }

        var action = closestData(t, 'action');
        if (action === 'new-audit')      { openModal('modal-new-audit'); return; }
        if (action === 'preview-report') { openModal('modal-report-preview'); return; }
        if (action === 'audit-report')   { renderAuditReport(); openModal('modal-audit-report'); return; }
        if (action === 'compare')        { renderCompareView(); openModal('modal-compare'); return; }
        if (action === 'share-interview') { shareInterviewLink(); return; }

        if (t.dataset && t.dataset.ivSet) {
            var ivBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.ivSet; });
            var iid = parseInt(ivBtn.dataset.itemId, 10);
            INTERVIEW_ANSWERS[iid] = INTERVIEW_ANSWERS[iid] || {};
            INTERVIEW_ANSWERS[iid].answer = ivBtn.dataset.ivSet;
            INTERVIEW_ANSWERS[iid].answeredBy = INTERVIEW_ANSWERS[iid].answeredBy || 'peter@kalmstrom.com';
            INTERVIEW_ANSWERS[iid].answeredAt = INTERVIEW_ANSWERS[iid].answeredAt || new Date().toISOString().slice(0, 10);
            renderInterview();
            return;
        }
        if (action === 'close-modal')    { closeAllModals(); return; }
        if (action === 'open-workspace') { show('workspace'); return; }
        if (action === 'export')         { alert('Export findings to CSV / DOCX (mockup).'); return; }
        if (action === 'generate')       { alert('Report generation kicked off (mockup).'); return; }
        if (action === 'copy-ps')        { copyPowerShell(); return; }
        if (action === 'run-ps')         { flashFooter('PowerShell session started (mockup).'); return; }
        if (action === 'print-report')   { window.print(); return; }
        if (action === 'ref-load-more')  { state.refLimit = (state.refLimit || 200) + 200; renderRefRows(); return; }
        if (action === 'toggle-theme')   { toggleTheme(); return; }
        if (action === 'toggle-cb')      { toggleColorBlind(); return; }
        if (action === 'open-cmdk')      { openCommandPalette(); return; }
        if (action === 'catalog-diff')   { renderCatalogDiff(); openModal('modal-catalog-diff'); return; }
        if (action === 'catalog-promote'){ flashFooter('Audit promoted to latest catalog (mockup).'); closeAllModals(); return; }

        if (t.dataset && t.dataset.arFilter) {
            state.reportFilter = t.dataset.arFilter;
            var chips = document.querySelectorAll('#ar-filter-chips .filter-chip');
            for (var z = 0; z < chips.length; z++) chips[z].classList.toggle('active', chips[z] === t);
            var host = document.getElementById('ar-findings-host');
            if (host) host.innerHTML = renderArFindings(state.reportFilter);
            return;
        }

        var catEl = findAncestor(t, function (el) { return el.matches && el.matches('#category-list li'); });
        if (catEl) { selectCategory(catEl.dataset.cat); return; }

        var itemEl = findAncestor(t, function (el) { return el.matches && el.matches('#item-list li[data-item-id]'); });
        if (itemEl) { selectItem(parseInt(itemEl.dataset.itemId, 10)); return; }

        var refCatEl = findAncestor(t, function (el) { return el.matches && el.matches('#ref-category-list li'); });
        if (refCatEl) {
            state.refCategory = refCatEl.dataset.refCat || null;
            state.refLimit = 200;
            renderRefCategoryList();
            renderRefRows();
            return;
        }

        if (t.dataset && t.dataset.status) {
            var btns = document.querySelectorAll('.status-filter .filter-chip');
            for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('active', btns[i] === t);
            state.statusFilter = t.dataset.status;
            renderItemList();
            return;
        }

        if (t.dataset && t.dataset.setStatus) {
            var sblist = document.querySelectorAll('.status-row .status-btn');
            for (var j = 0; j < sblist.length; j++) {
                sblist[j].classList.remove('active', 'pass', 'fail', 'na', 'pending');
                sblist[j].classList.add(sblist[j].dataset.setStatus);
                if (sblist[j].dataset.setStatus === t.dataset.setStatus) {
                    sblist[j].classList.add('active');
                }
            }
            return;
        }
        if (t.dataset && t.dataset.setLifecycle) {
            var lcBtn = findAncestor(t, function (el) { return el.dataset && el.dataset.setLifecycle; });
            var lid = parseInt(lcBtn.dataset.itemId, 10);
            var newState = lcBtn.dataset.setLifecycle;
            FINDINGS[lid] = FINDINGS[lid] || { status: 'fail', risk: 'med', observation: '' };
            FINDINGS[lid].lifecycle = FINDINGS[lid].lifecycle || {};
            FINDINGS[lid].lifecycle.state = newState;
            /* Pre-fill acceptance fields the first time it's accepted */
            if (newState === 'accepted') {
                if (!FINDINGS[lid].lifecycle.signedBy) FINDINGS[lid].lifecycle.signedBy = CURRENT_USER;
                if (!FINDINGS[lid].lifecycle.signedAt) FINDINGS[lid].lifecycle.signedAt = TODAY_ISO;
                if (!FINDINGS[lid].lifecycle.expiresAt) {
                    var d = new Date(TODAY_ISO);
                    d.setFullYear(d.getFullYear() + 1);
                    FINDINGS[lid].lifecycle.expiresAt = d.toISOString().slice(0, 10);
                }
            }
            renderDetail(lid); renderItemList();
            flashFooter('Lifecycle: ' + lifecycleLabel(newState));
            return;
        }

        if (t.dataset && t.dataset.setRisk) {
            var rps = document.querySelectorAll('.risk-row .risk-pill');
            for (var k = 0; k < rps.length; k++) {
                rps[k].classList.toggle('active', rps[k].dataset.setRisk === t.dataset.setRisk);
            }
            return;
        }

        if (t.dataset && t.dataset.auditFilter) {
            var chips = document.querySelectorAll('#audits-filter-row .filter-chip');
            for (var u = 0; u < chips.length; u++) chips[u].classList.toggle('active', chips[u] === t);
            renderAuditsTable(t.dataset.auditFilter);
            return;
        }

        if (t.dataset && t.dataset.jumpItem) {
            var jid = parseInt(t.dataset.jumpItem, 10);
            var item = ITEMS[jid - 1];
            if (item) { show('workspace'); selectCategory(item.category); selectItem(jid); }
            return;
        }

        if (t.classList && t.classList.contains('settings-nav-item')) {
            var navs = document.querySelectorAll('.settings-nav-item');
            for (var n = 0; n < navs.length; n++) navs[n].classList.toggle('active', navs[n] === t);
            return;
        }
    });

    /* ----- Keyboard shortcuts -------------------------------- */

    function isTypingTarget(el) {
        if (!el) return false;
        if (el.isContentEditable) return true;
        var tag = (el.tagName || '').toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select';
    }

    function neighborItemId(direction) {
        var cat = CAT_INDEX.cats[state.activeCategory];
        if (!cat) return null;
        var lis = document.querySelectorAll('#item-list li[data-item-id]');
        if (!lis.length) return null;
        var ids = [];
        for (var i = 0; i < lis.length; i++) ids.push(parseInt(lis[i].dataset.itemId, 10));
        var idx = ids.indexOf(state.activeItemId);
        if (idx < 0) return ids[0];
        var ni = direction > 0 ? Math.min(ids.length - 1, idx + 1) : Math.max(0, idx - 1);
        return ids[ni];
    }

    function neighborCategoryName(direction) {
        var idx = CAT_INDEX.order.indexOf(state.activeCategory);
        if (idx < 0) return CAT_INDEX.order[0];
        var ni = direction > 0 ? Math.min(CAT_INDEX.order.length - 1, idx + 1) : Math.max(0, idx - 1);
        return CAT_INDEX.order[ni];
    }

    function setStatusForActive(status) {
        var id = state.activeItemId;
        if (!id) return;
        var prev = FINDINGS[id] ? JSON.parse(JSON.stringify(FINDINGS[id])) : null;
        FINDINGS[id] = FINDINGS[id] || { observation: '', risk: 'none' };
        FINDINGS[id].status = status;
        if (status === 'fail') {
            if (!FINDINGS[id].risk || FINDINGS[id].risk === 'none') FINDINGS[id].risk = 'med';
        } else {
            FINDINGS[id].risk = 'none';
            if (FINDINGS[id].lifecycle) delete FINDINGS[id].lifecycle;
        }
        FINDINGS[id].checkedAt = TODAY_ISO;
        UNDO_LOG.push({ kind: 'single', changes: [{ id: id, prev: prev }] });
        rebuildIndex();
        renderItemList();
        renderCategoryList(document.getElementById('cat-filter') ? document.getElementById('cat-filter').value : '');
        renderDetail(id);
        flashFooter('Item #' + id + ' → ' + statusLabel(status) + (status === 'fail' ? ' (MED)' : ''));
    }

    function setRiskForActive(risk) {
        var id = state.activeItemId;
        if (!id || !FINDINGS[id]) { flashFooter('Set status before risk.'); return; }
        var prev = JSON.parse(JSON.stringify(FINDINGS[id]));
        FINDINGS[id].risk = risk;
        UNDO_LOG.push({ kind: 'single', changes: [{ id: id, prev: prev }] });
        renderDetail(id);
        flashFooter('Risk set to ' + risk.toUpperCase());
    }

    function showShortcutHelp() {
        var existing = document.getElementById('shortcut-help-popover');
        if (existing) { existing.remove(); return; }
        var pop = document.createElement('div');
        pop.id = 'shortcut-help-popover';
        pop.className = 'shortcut-help';
        pop.innerHTML =
            '<div class="sh-title">Keyboard shortcuts</div>' +
            '<dl>' +
                '<dt><kbd>J</kbd> / <kbd>K</kbd></dt><dd>next / previous check</dd>' +
                '<dt><kbd>Shift</kbd>+<kbd>J/K</kbd></dt><dd>next / previous category</dd>' +
                '<dt><kbd>1</kbd> &middot; <kbd>2</kbd> &middot; <kbd>3</kbd> &middot; <kbd>4</kbd></dt><dd>mark Pending / Pass / Fail / N/A</dd>' +
                '<dt><kbd>H</kbd> &middot; <kbd>M</kbd> &middot; <kbd>L</kbd></dt><dd>set High / Medium / Low risk</dd>' +
                '<dt><kbd>X</kbd></dt><dd>toggle selection of current item</dd>' +
                '<dt><kbd>P</kbd></dt><dd>open PowerShell snippet</dd>' +
                '<dt><kbd>O</kbd></dt><dd>open in portal</dd>' +
                '<dt><kbd>/</kbd></dt><dd>focus search</dd>' +
                '<dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>undo last change</dd>' +
                '<dt><kbd>R</kbd></dt><dd>open audit status report</dd>' +
                '<dt><kbd>Esc</kbd></dt><dd>close modals / popover</dd>' +
                '<dt><kbd>?</kbd></dt><dd>this help</dd>' +
            '</dl>';
        document.body.appendChild(pop);
    }

    document.addEventListener('keydown', function (e) {
        /* Ctrl/Cmd + K → command palette (always available, even from inputs) */
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            openCommandPalette();
            return;
        }

        /* Command palette navigation when open */
        var cmd = document.getElementById('cmd-palette');
        if (cmd && !cmd.hasAttribute('hidden')) {
            if (e.key === 'Escape') { closeCommandPalette(); e.preventDefault(); return; }
            if (e.key === 'ArrowDown') {
                state.cmdActiveIdx = Math.min(CMD_RESULTS.length - 1, state.cmdActiveIdx + 1);
                renderCmdResults((document.getElementById('cmd-input') || {}).value || '');
                e.preventDefault(); return;
            }
            if (e.key === 'ArrowUp') {
                state.cmdActiveIdx = Math.max(0, state.cmdActiveIdx - 1);
                renderCmdResults((document.getElementById('cmd-input') || {}).value || '');
                e.preventDefault(); return;
            }
            if (e.key === 'Enter') {
                jumpFromCmd(CMD_RESULTS[state.cmdActiveIdx]);
                e.preventDefault(); return;
            }
            return; /* swallow other keys while palette open */
        }

        if (e.key === 'Escape') {
            var pop = document.getElementById('shortcut-help-popover');
            if (pop) { pop.remove(); return; }
            closeSlaPopover();
            closeAllModals();
            return;
        }

        if (isTypingTarget(e.target)) return;

        var key = e.key;

        if (key === '?') { showShortcutHelp(); e.preventDefault(); return; }
        if ((e.ctrlKey || e.metaKey) && (key === 'z' || key === 'Z')) { undoLast(); e.preventDefault(); return; }
        if (key === '/') {
            var screen = document.querySelector('.screen.active');
            var s = screen && screen.querySelector('input[type="search"]');
            if (s) { s.focus(); e.preventDefault(); }
            return;
        }
        if (key === 'r' || key === 'R') {
            renderAuditReport(); openModal('modal-audit-report'); e.preventDefault(); return;
        }

        var ws = document.querySelector('.screen.active');
        if (!ws || ws.dataset.screen !== 'workspace') return;

        if (key === 'j' || key === 'J') {
            if (e.shiftKey) selectCategory(neighborCategoryName(1));
            else { var n = neighborItemId(1); if (n) selectItem(n); }
            e.preventDefault(); return;
        }
        if (key === 'k' || key === 'K') {
            if (e.shiftKey) selectCategory(neighborCategoryName(-1));
            else { var p = neighborItemId(-1); if (p) selectItem(p); }
            e.preventDefault(); return;
        }
        if (key === '1') { setStatusForActive('pending'); e.preventDefault(); return; }
        if (key === '2') { setStatusForActive('pass');    e.preventDefault(); return; }
        if (key === '3') { setStatusForActive('fail');    e.preventDefault(); return; }
        if (key === '4') { setStatusForActive('na');      e.preventDefault(); return; }
        if (key === 'h' || key === 'H') { setRiskForActive('high'); e.preventDefault(); return; }
        if (key === 'm' || key === 'M') { setRiskForActive('med');  e.preventDefault(); return; }
        if (key === 'l' || key === 'L') { setRiskForActive('low');  e.preventDefault(); return; }
        if (key === 'x' || key === 'X') {
            if (state.activeItemId) {
                if (state.selectedIds[state.activeItemId]) delete state.selectedIds[state.activeItemId];
                else state.selectedIds[state.activeItemId] = true;
                renderItemList();
            }
            e.preventDefault(); return;
        }
        if (key === 'p' || key === 'P') { if (state.activeItemId) showPowerShellFor(state.activeItemId); e.preventDefault(); return; }
        if (key === 'o' || key === 'O') { if (state.activeItemId) openPortalFor(state.activeItemId);    e.preventDefault(); return; }
    });

    /* close modal on backdrop click */
    document.addEventListener('mousedown', function (e) {
        if (e.target && e.target.classList && e.target.classList.contains('modal-backdrop')) {
            e.target.setAttribute('hidden', '');
        }
    });

    /* closestData + findAncestor come from helpers.js */

    /* ----- Live search inputs --------------------------------- */

    function bindLiveInputs() {
        var catFilter = document.getElementById('cat-filter');
        if (catFilter) catFilter.addEventListener('input', function () { renderCategoryList(catFilter.value); });

        var refSearch = document.getElementById('ref-search');
        if (refSearch) refSearch.addEventListener('input', function () { state.refSearch = refSearch.value; state.refLimit = 200; renderRefRows(); });

        var cmdInput = document.getElementById('cmd-input');
        if (cmdInput) cmdInput.addEventListener('input', function () { runCmdSearch(cmdInput.value); });

        /* Close command palette on backdrop click */
        var cmdBd = document.getElementById('cmd-palette');
        if (cmdBd) cmdBd.addEventListener('mousedown', function (e) {
            if (e.target === cmdBd) closeCommandPalette();
        });

        /* Evidence dropzone — drag and drop */
        document.addEventListener('dragover', function (e) {
            var dz = e.target.closest && e.target.closest('.evidence-dropzone');
            if (dz) {
                e.preventDefault();
                dz.classList.add('drop-active');
            }
        });
        document.addEventListener('dragleave', function (e) {
            var dz = e.target.closest && e.target.closest('.evidence-dropzone');
            if (dz) dz.classList.remove('drop-active');
        });
        document.addEventListener('drop', function (e) {
            var dz = e.target.closest && e.target.closest('.evidence-dropzone');
            if (!dz) return;
            e.preventDefault();
            dz.classList.remove('drop-active');
            var iid = parseInt(dz.dataset.itemId, 10);
            var files = (e.dataTransfer && e.dataTransfer.files) || [];
            for (var i = 0; i < files.length; i++) attachEvidence(iid, files[i].name);
            if (!files.length) {
                /* mockup fallback when no real file dropped */
                attachEvidence(iid, 'dropped-' + new Date().toISOString().slice(0, 10) + '.png');
            }
        });
    }

    /* ----- Color-blind safe mode ------------------------------ */

    function toggleColorBlind() {
        state.cbMode = !state.cbMode;
        document.documentElement.classList.toggle('cb-mode', state.cbMode);
        flashFooter(state.cbMode ? 'Color-blind safe mode ON (patterns + glyphs).' : 'Color-blind safe mode OFF.');
    }

    /* ----- Ctrl+K command palette ----------------------------- */

    var CMD_RESULTS = []; /* [{ kind: 'item' | 'category', label, id, ...}] */

    function openCommandPalette() {
        var bd = document.getElementById('cmd-palette');
        if (!bd) return;
        bd.removeAttribute('hidden');
        var inp = document.getElementById('cmd-input');
        if (inp) {
            inp.value = '';
            inp.focus();
        }
        state.cmdActiveIdx = 0;
        runCmdSearch('');
    }
    function closeCommandPalette() {
        var bd = document.getElementById('cmd-palette');
        if (bd) bd.setAttribute('hidden', '');
    }
    function highlightMatch(text, q) {
        if (!q) return escape(text);
        var idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx < 0) return escape(text);
        return escape(text.substring(0, idx)) +
               '<mark>' + escape(text.substring(idx, idx + q.length)) + '</mark>' +
               escape(text.substring(idx + q.length));
    }
    function runCmdSearch(q) {
        q = (q || '').trim();
        var qLow = q.toLowerCase();
        var results = [];

        /* If "#NN" → direct ID lookup */
        var idMatch = q.match(/^#?(\d+)$/);
        if (idMatch) {
            var id = parseInt(idMatch[1], 10);
            var it = ITEMS[id - 1];
            if (it) results.push({ kind: 'item', id: it.id, label: it.description, category: it.category, score: 1000 });
        }

        if (!idMatch) {
            for (var i = 0; i < ITEMS.length && results.length < 30; i++) {
                var item = ITEMS[i];
                if (!q) {
                    /* Show recent / failing first */
                    var f0 = FINDINGS[item.id];
                    if (f0 && f0.status === 'fail') {
                        results.push({ kind: 'item', id: item.id, label: item.description, category: item.category, score: 100 });
                    }
                } else {
                    var hayItem = (item.description + ' ' + item.category).toLowerCase();
                    var hit = hayItem.indexOf(qLow);
                    if (hit >= 0) {
                        var score = 0;
                        if (item.description.toLowerCase().indexOf(qLow) === 0) score += 50;
                        else if (item.description.toLowerCase().indexOf(qLow) >= 0) score += 30;
                        if (item.category.toLowerCase().indexOf(qLow) >= 0) score += 10;
                        results.push({ kind: 'item', id: item.id, label: item.description, category: item.category, score: score });
                    }
                }
            }
            results.sort(function (a, b) { return b.score - a.score; });
            results = results.slice(0, 30);

            /* Add category jumps */
            if (q) {
                for (var ci = 0; ci < CAT_INDEX.order.length && results.length < 36; ci++) {
                    var cn = CAT_INDEX.order[ci];
                    if (cn.toLowerCase().indexOf(qLow) >= 0) {
                        results.push({ kind: 'category', label: cn, score: 5 });
                    }
                }
            }
        }

        CMD_RESULTS = results;
        state.cmdActiveIdx = 0;
        renderCmdResults(q);
    }
    function renderCmdResults(q) {
        var host = document.getElementById('cmd-results');
        var count = document.getElementById('cmd-count');
        if (!host) return;
        if (count) count.textContent = CMD_RESULTS.length + ' result' + (CMD_RESULTS.length === 1 ? '' : 's');
        if (!CMD_RESULTS.length) {
            host.innerHTML = '<div class="cmd-empty">' + (q ? 'No matches for "' + escape(q) + '".' : 'Type to search 624 catalog items.') + '</div>';
            return;
        }
        var html = '';
        for (var i = 0; i < CMD_RESULTS.length; i++) {
            var r = CMD_RESULTS[i];
            var active = i === state.cmdActiveIdx ? ' active' : '';
            if (r.kind === 'item') {
                var item = ITEMS[r.id - 1];
                html += '<div class="cmd-result' + active + '" data-cmd-idx="' + i + '" data-cmd-kind="item" data-cmd-id="' + r.id + '">' +
                    '<span class="cmd-result-id">#' + r.id + '</span>' +
                    productIcon(r.category, 'icon-product-sm') +
                    '<span class="cmd-result-text">' + highlightMatch(r.label, q) + '</span>' +
                    '<span class="cmd-result-cat">' + escape(r.category) + '</span>' +
                '</div>';
            } else if (r.kind === 'category') {
                html += '<div class="cmd-result' + active + '" data-cmd-idx="' + i + '" data-cmd-kind="category" data-cmd-cat="' + escape(r.label) + '">' +
                    '<span class="cmd-result-id">CAT</span>' +
                    productIcon(r.label, 'icon-product-sm') +
                    '<span class="cmd-result-text"><strong>' + highlightMatch(r.label, q) + '</strong></span>' +
                    '<span class="cmd-result-cat">jump to category</span>' +
                '</div>';
            }
        }
        host.innerHTML = html;
    }
    function jumpFromCmd(r) {
        if (!r) return;
        closeCommandPalette();
        if (r.kind === 'item') {
            var it = ITEMS[r.id - 1];
            if (!it) return;
            show('workspace');
            selectCategory(it.category);
            selectItem(r.id);
        } else if (r.kind === 'category') {
            show('workspace');
            selectCategory(r.label);
        }
    }

    /* ----- Owner / SLA bulk-assign ---------------------------- */

    function openSlaPopover(anchor) {
        closeSlaPopover();
        var pop = document.createElement('div');
        pop.className = 'bulk-sla-popover';
        pop.id = 'bulk-sla-popover';
        pop.innerHTML =
            '<label>Owner (email)</label>' +
            '<input type="text" id="bsp-owner" placeholder="owner@example.com" value="' + escape(CURRENT_USER) + '">' +
            '<label>Target date</label>' +
            '<input type="date" id="bsp-date" value="">' +
            '<div class="bsp-actions">' +
                '<button class="btn btn-secondary" data-bsp-cancel>Cancel</button>' +
                '<button class="btn btn-primary" data-bsp-apply>Assign</button>' +
            '</div>';
        var rect = anchor.getBoundingClientRect();
        pop.style.position = 'absolute';
        pop.style.left = rect.left + 'px';
        pop.style.top = (rect.bottom + window.scrollY + 4) + 'px';
        document.body.appendChild(pop);
        var inp = document.getElementById('bsp-owner');
        if (inp) inp.focus();
    }
    function closeSlaPopover() {
        var pop = document.getElementById('bulk-sla-popover');
        if (pop) pop.remove();
    }
    function applySlaToSelection() {
        var owner = (document.getElementById('bsp-owner') || {}).value || '';
        var date  = (document.getElementById('bsp-date')  || {}).value || '';
        if (!owner) { flashFooter('Owner required.'); return; }
        var changed = [];
        for (var k in state.selectedIds) {
            if (!state.selectedIds.hasOwnProperty(k)) continue;
            var id = parseInt(k, 10);
            var prev = FINDINGS[id] ? JSON.parse(JSON.stringify(FINDINGS[id])) : null;
            if (!FINDINGS[id]) continue;
            if (FINDINGS[id].status !== 'fail') continue; /* only fails get owner */
            FINDINGS[id].lifecycle = FINDINGS[id].lifecycle || { state: 'remediating' };
            if (FINDINGS[id].lifecycle.state === 'open' || !FINDINGS[id].lifecycle.state) {
                FINDINGS[id].lifecycle.state = 'remediating';
            }
            FINDINGS[id].lifecycle.owner = owner;
            if (date) FINDINGS[id].lifecycle.targetDate = date;
            changed.push({ id: id, prev: prev });
        }
        if (changed.length) UNDO_LOG.push({ kind: 'bulk', changes: changed });
        closeSlaPopover();
        clearSelection();
        rebuildIndex();
        renderItemList();
        renderCategoryList(document.getElementById('cat-filter') ? document.getElementById('cat-filter').value : '');
        if (state.activeItemId) renderDetail(state.activeItemId);
        flashFooter('Assigned ' + changed.length + ' item' + (changed.length === 1 ? '' : 's') + ' to ' + owner + (date ? ' · due ' + date : '') + '. Ctrl+Z to undo.');
    }

    /* ----- Evidence attachment (drop / click to attach) ------ */

    function attachEvidence(itemId, fileName) {
        var f = FINDINGS[itemId];
        if (!f) {
            FINDINGS[itemId] = { status: 'pending', risk: 'none', evidence: [fileName] };
        } else {
            f.evidence = f.evidence || [];
            f.evidence.push(fileName);
        }
        renderDetail(itemId);
        flashFooter('Evidence "' + fileName + '" attached to #' + itemId + '.');
    }
    function removeEvidence(itemId, name) {
        var f = FINDINGS[itemId];
        if (!f || !f.evidence) return;
        var idx = f.evidence.indexOf(name);
        if (idx >= 0) {
            f.evidence.splice(idx, 1);
            renderDetail(itemId);
            flashFooter('Evidence removed from #' + itemId + '.');
        }
    }

    /* ----- Catalog version banner & diff modal --------------- */

    function renderCatalogBanner() {
        var host = document.getElementById('catalog-banner-host');
        if (!host) return;
        var a = ACTIVE_AUDIT;
        var deltas = window.CATALOG_DELTAS || {};
        var versions = window.CATALOG_VERSIONS || [];
        var latest = versions.length ? versions[versions.length - 1].id : a.catalogVersion;
        if (!a.catalogVersion || a.catalogVersion === latest) {
            host.innerHTML = '<div class="catalog-banner">' +
                svg('a-shield-check', 'icon-sm') +
                '<div>This audit is on the latest catalog <strong>' + escape(a.catalogVersion) + '</strong>.</div>' +
            '</div>';
            return;
        }
        /* Aggregate deltas from audit version up to latest */
        var added = 0, changed = 0, removed = 0;
        var cursor = a.catalogVersion;
        var safety = 0;
        while (cursor !== latest && safety++ < 10) {
            var nextVer = nextVersionAfter(cursor);
            if (!nextVer) break;
            var d = deltas[nextVer];
            if (d) {
                added   += (d.added   || []).length;
                changed += (d.changed || []).length;
                removed += (d.removed || []).length;
            }
            cursor = nextVer;
        }
        host.innerHTML = '<div class="catalog-banner behind">' +
            svg('a-diff', 'icon-sm') +
            '<div>Audit on catalog <strong>' + escape(a.catalogVersion) + '</strong> &middot; latest is <strong>' + escape(latest) + '</strong>: ' +
                '<strong>' + added + '</strong> added &middot; ' +
                '<strong>' + changed + '</strong> changed &middot; ' +
                '<strong>' + removed + '</strong> removed.</div>' +
            '<button class="btn-link" data-action="catalog-diff">View diff &rsaquo;</button>' +
        '</div>';
    }
    function nextVersionAfter(version) {
        var versions = window.CATALOG_VERSIONS || [];
        for (var i = 0; i < versions.length; i++) {
            if (versions[i].id === version && i + 1 < versions.length) return versions[i + 1].id;
        }
        return null;
    }
    function renderCatalogDiff() {
        var body = document.getElementById('cdiff-body');
        if (!body) return;
        var a = ACTIVE_AUDIT;
        var deltas = window.CATALOG_DELTAS || {};
        var versions = window.CATALOG_VERSIONS || [];
        var latest = versions.length ? versions[versions.length - 1].id : a.catalogVersion;

        var totals = { added: [], changed: [], removed: [] };
        var cursor = a.catalogVersion;
        var safety = 0;
        while (cursor !== latest && safety++ < 10) {
            var nextVer = nextVersionAfter(cursor);
            if (!nextVer) break;
            var d = deltas[nextVer];
            if (d) {
                totals.added   = totals.added.concat(d.added   || []);
                totals.changed = totals.changed.concat(d.changed || []);
                totals.removed = totals.removed.concat(d.removed || []);
            }
            cursor = nextVer;
        }

        var html = '<div style="font-size:13px;margin-bottom:6px">' +
            'Comparing audit catalog <strong>' + escape(a.catalogVersion) + '</strong> ' +
            '<svg class="icon icon-sm" aria-hidden="true" style="vertical-align:-2px;margin:0 4px"><use href="#a-arrow-right"/></svg> ' +
            'latest catalog <strong>' + escape(latest) + '</strong>' +
        '</div>';
        html += '<div class="cdiff-summary-row">' +
            '<div class="cdiff-summary added"><div class="cdiff-summary-num">' + totals.added.length + '</div><div class="cdiff-summary-lbl">Added</div></div>' +
            '<div class="cdiff-summary changed"><div class="cdiff-summary-num">' + totals.changed.length + '</div><div class="cdiff-summary-lbl">Changed</div></div>' +
            '<div class="cdiff-summary removed"><div class="cdiff-summary-num">' + totals.removed.length + '</div><div class="cdiff-summary-lbl">Removed</div></div>' +
        '</div>';

        function renderEntries(entries, kind) {
            if (!entries.length) return '';
            var label = kind === 'added' ? 'Added items' : kind === 'changed' ? 'Changed items' : 'Removed items';
            var h = '<h3 style="margin:14px 0 6px 0;font-size:14px">' + label + '</h3><ul class="cdiff-list">';
            for (var i = 0; i < entries.length; i++) {
                var e = entries[i];
                var item = ITEMS[e.id - 1];
                h += '<li class="' + kind + '">' +
                    '<span class="cdiff-id">#' + e.id + '</span>' +
                    '<div class="cdiff-text">' +
                        '<strong>' + escape(item ? item.description : '(removed item)') + '</strong>' +
                        '<em>' + escape(e.reason) + '</em>' +
                    '</div>' +
                '</li>';
            }
            h += '</ul>';
            return h;
        }
        html += renderEntries(totals.added,   'added');
        html += renderEntries(totals.changed, 'changed');
        html += renderEntries(totals.removed, 'removed');
        body.innerHTML = html;
    }

    /* ----- Tenant rollup (dashboard) ------------------------- */

    function renderTenantRollup() {
        var host = document.getElementById('tenant-rollup');
        if (!host) return;
        var a = ACTIVE_AUDIT;
        var tenants = (a.tenants || [a.tenant]).slice();
        var byTenant = {};
        for (var i = 0; i < tenants.length; i++) byTenant[tenants[i]] = { pass: 0, fail: 0, na: 0, pending: 0 };
        for (var j = 0; j < ITEMS.length; j++) {
            var t = tenantOf(ITEMS[j].id);
            if (!byTenant[t]) byTenant[t] = { pass: 0, fail: 0, na: 0, pending: 0 };
            var f = FINDINGS[ITEMS[j].id];
            if (!f) byTenant[t].pending++;
            else if (f.status === 'pass') byTenant[t].pass++;
            else if (f.status === 'fail') byTenant[t].fail++;
            else if (f.status === 'na') byTenant[t].na++;
            else byTenant[t].pending++;
        }
        var html = '';
        for (var k = 0; k < tenants.length; k++) {
            var ten = tenants[k];
            var c = byTenant[ten] || { pass: 0, fail: 0, na: 0, pending: 0 };
            var total = c.pass + c.fail + c.na + c.pending;
            var w = function (n) { return total ? (n / total * 100).toFixed(1) + '%' : '0%'; };
            html += '<div class="tenant-rollup-card">' +
                '<div class="tenant-rollup-card-head">' +
                    svg('a-shield-check', 'icon-sm') +
                    '<span>' + (k === 0 ? 'Production' : 'Development') + '</span>' +
                    '<code>' + escape(ten) + '</code>' +
                '</div>' +
                '<div class="tenant-rollup-bar">' +
                    '<span style="background:var(--accent-green);width:' + w(c.pass) + '"></span>' +
                    '<span style="background:var(--accent-red);width:'   + w(c.fail) + '"></span>' +
                    '<span style="background:#686b6e;width:'              + w(c.na)   + '"></span>' +
                    '<span style="background:var(--border);width:'        + w(c.pending) + '"></span>' +
                '</div>' +
                '<div class="tenant-rollup-stats">' +
                    '<span><strong>' + c.pass + '</strong> pass</span>' +
                    '<span><strong>' + c.fail + '</strong> fail</span>' +
                    '<span><strong>' + c.na + '</strong> n/a</span>' +
                    '<span><strong>' + c.pending + '</strong> pending</span>' +
                '</div>' +
            '</div>';
        }
        host.innerHTML = html;
    }

    /* ----- Boot ----------------------------------------------- */

    document.addEventListener('DOMContentLoaded', function () {
        applyInitialTheme();
        renderDashboardHero();
        renderTenantRollup();
        renderHeatmap('dashboard-heatmap');
        renderCatalogBanner();
        renderDashboardAudits();
        renderActivity();
        renderAuditsTable('all');
        renderFindingsBars();
        renderBenchmarksWidget();
        updateInterviewBadge();
        bindLiveInputs();
    });

    function updateInterviewBadge() {
        var badge = document.getElementById('nav-interview-badge');
        if (!badge) return;
        var answered = 0;
        for (var k = 0; k < INTERVIEW_IDS.length; k++) if (INTERVIEW_ANSWERS[INTERVIEW_IDS[k]]) answered++;
        var pending = INTERVIEW_IDS.length - answered;
        if (pending > 0) { badge.style.display = ''; badge.textContent = pending; }
        else badge.style.display = 'none';
    }
})();
