/**
 * NSChecks — Shared rendering for checklist controls.
 * Used by both the mobile app (nschecks-app.html) and the admin preview (nschecks-admin.html).
 *
 * Provides:
 *   NSRender.field(field, index, totalAnswerable) — renders one field's control HTML
 *   NSRender.allFields(template) — renders all fields as flat HTML (used internally)
 *   NSRender.phoneFrame(templateName, docNumber, category, fieldsHtml, totalSteps) — legacy flat
 *   NSRender.wizardPreview(template) — full interactive wizard preview (step-by-step)
 */
var NSRender = {

    /** Render the control HTML for a single field */
    fieldControl: function(f) {
        var html = '';
        switch (f.type) {
            case 'Choice':
            case 'Tristate': // backward compat
                var choices = f.choices || ['Godkänt', 'Ej godkänt', 'Ej relevant'];
                var icons = ['&#10003;', '&#10007;', '&mdash;', '&#9679;', '&#9679;'];
                html += '<div class="tri-stack">';
                for (var ci = 0; ci < choices.length; ci++) {
                    html += '<div class="tri"><div class="ic">' + (icons[ci] || '&#9679;') + '</div>' + choices[ci] + '</div>';
                }
                html += '</div>';
                break;
            case 'Binary':
                html += '<div class="bin-row">';
                html += '<div class="bin"><span class="bin-icon">&#10003;</span>Ja</div>';
                html += '<div class="bin"><span class="bin-icon">&#10007;</span>Nej</div>';
                html += '</div>';
                break;
            case 'BinaryForced':
                html += '<div class="bin-row">';
                html += '<div class="bin"><span class="bin-icon">&#10003;</span>OK</div>';
                html += '<div class="bin"><span class="bin-icon">&#10007;</span>Ej OK</div>';
                html += '</div>';
                html += '<div style="font-size:12px;font-weight:700;color:var(--e);margin-bottom:8px;">&#9888; Kommentar krävs vid "Ej OK"</div>';
                break;
            case 'Date':
                html += '<input class="date-input" type="text" value="ÅÅÅÅ-MM-DD" readonly />';
                break;
            case 'Text':
                html += '<div class="fi-group">';
                html += '<input class="fi" type="text" placeholder="Ange text..." readonly /></div>';
                break;
            case 'Number':
                html += '<div class="fi-group"><div class="fi-label">' + f.name + (f.unit ? ' (' + f.unit + ')' : '') + '</div>';
                html += '<div style="display:flex;align-items:center;gap:8px;">';
                html += '<input class="fi" type="text" placeholder="Ange värde..." readonly style="flex:1;" />';
                if (f.unit) html += '<span style="font-size:14px;color:var(--tm);font-weight:700;">' + f.unit + '</span>';
                html += '</div></div>';
                break;
            case 'MultiText':
                html += '<textarea class="cmt" placeholder="Fritext..." rows="4" readonly style="min-height:100px;"></textarea>';
                break;
            case 'Confirm':
                html += '<div class="conf"><div class="conf-box">&#10003;</div><div class="conf-txt">' + f.name + '</div></div>';
                break;
            case 'Repeater':
                html += '<div class="rpt-form"><div class="rpt-form-title">Lägg till rader</div>';
                html += '<div style="font-size:12px;color:var(--tm);">' + (f.hint || 'Upprepad datainmatning') + '</div></div>';
                break;
            case 'Signature':
                html += '<div class="sig-wrap" style="height:160px;cursor:default;">';
                html += '<div class="sig-ph"><div class="sig-ph-icon">&#9998;</div><div class="sig-ph-text">Rita din signatur här</div></div>';
                html += '</div>';
                break;
        }
        return html;
    },

    /** Build wizard steps from template fields. Each answerable field = one step.
     *  Headers/Info before an answerable field get merged into that step.
     *  Returns array of { label, fields } where fields is array of field objects.
     */
    buildSteps: function(template) {
        var steps = [];
        var pendingHeaders = [];

        template.fields.forEach(function(f) {
            if (f.type === 'Header' || f.type === 'Info') {
                pendingHeaders.push(f);
                return;
            }
            steps.push({
                headerFields: pendingHeaders.slice(),
                field: f
            });
            pendingHeaders = [];
        });

        // If trailing headers/info with no answerable field, add as a final step
        if (pendingHeaders.length > 0) {
            steps.push({
                headerFields: pendingHeaders,
                field: null
            });
        }

        return steps;
    },

    /** Render a single wizard card (step) */
    renderStep: function(step, stepIndex, totalSteps) {
        var html = '<div class="wiz-card">';

        // Render any header/info blocks preceding the answerable field
        step.headerFields.forEach(function(h) {
            if (h.type === 'Header') {
                html += '<div class="card-label" style="margin-top:0;">' + h.name + '</div>';
            } else if (h.type === 'Info') {
                html += '<div class="info-block" style="margin-bottom:16px;"><div class="info-block-title">&#9432; ' + (h.name || 'Information') + '</div>';
                if (h.hint) html += '<div class="info-block-text">' + h.hint + '</div>';
                html += '</div>';
            }
        });

        // Render the answerable field
        var f = step.field;
        if (!f) {
            html += '</div>';
            return html;
        }

        html += '<div class="nbadge">' + (stepIndex + 1) + ' / ' + totalSteps + '</div>';
        html += '<div class="card-q">' + f.name;
        if (f.req) html += '<span class="req-dot"></span>';
        html += '</div>';
        if (f.hint) html += '<div class="card-hint">' + f.hint + '</div>';

        html += NSRender.fieldControl(f);

        // Attachment chips (not on Signature, Confirm, Repeater)
        if (['Signature', 'Confirm', 'Repeater'].indexOf(f.type) < 0) {
            html += '<div class="attach-chips">';
            html += '<div class="attach-chip"><span class="attach-chip-icon">&#128172;</span> Kommentar</div>';
            if (!f.photo) html += '<div class="attach-chip"><span class="attach-chip-icon">&#128247;</span> Foto</div>';
            else html += '<div class="attach-chip required"><span class="attach-chip-icon">&#128247;</span> Foto krävs</div>';
            html += '</div>';
        }

        html += '</div>';
        return html;
    },

    /** Build a full interactive wizard preview for a template.
     *  Returns HTML string with phone frame, wizard header, step cards, and nav buttons.
     *  Each preview instance gets a unique ID for independent navigation.
     */
    wizardPreview: function(template) {
        var steps = this.buildSteps(template);
        var totalSteps = steps.length;
        var instanceId = 'wizPrev_' + Date.now();

        // Build progress segments
        var progSegs = '';
        for (var s = 0; s < totalSteps; s++) {
            progSegs += '<div class="prog-seg' + (s === 0 ? ' active' : ' empty') + '"></div>';
        }

        // Build all step cards
        var cardsHtml = '';
        for (var i = 0; i < totalSteps; i++) {
            cardsHtml += this.renderStep(steps[i], i, totalSteps);
        }

        // Phone frame with wizard structure (wrapped in .nsc for SP-defensive scoping)
        var html = '<div class="nsc"><div class="phone" id="' + instanceId + '" style="width:390px;height:844px;max-height:none;">';

        // Status bar
        html += '<div class="sbar"><span>09:45</span><span>NSChecks</span><span>78%</span></div>';

        // Wizard header
        html += '<div class="wiz-header">';
        html += '<div class="wiz-header-top">';
        html += '<div class="app-bar-back" style="width:36px;height:36px;cursor:default;">&#8592;</div>';
        html += '<svg viewBox="0 0 15 20" width="12" height="16" style="flex-shrink:0;"><rect x="0" y="15.5" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="5.25" y="10.25" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="10.5" y="5" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="5.25" y="0" width="4.5" height="4.5" fill="rgba(46,158,95,0.5)"/></svg>';
        html += '<div class="wiz-header-info">';
        html += '<div class="wiz-title">' + template.name + '</div>';
        html += '<div class="wiz-sub">' + template.doc + ' &middot; ' + template.cat + '</div>';
        html += '</div></div>';
        html += '<div class="wiz-header-row2">';
        html += '<div class="step-counter" data-wiz-step>Steg 1 / ' + totalSteps + '</div>';
        html += '</div>';
        html += '<div class="prog-track" data-wiz-prog>' + progSegs + '</div>';
        html += '</div>';

        // Viewport with track
        html += '<div class="vp">';
        html += '<div class="track" data-wiz-track>' + cardsHtml + '</div>';
        html += '</div>';

        // Bottom nav
        html += '<div class="bnav">';
        html += '<button class="nb nb-prev" data-wiz-prev disabled>&#8592;</button>';
        html += '<button class="nb nb-next" data-wiz-next>NÄSTA &#8594;</button>';
        html += '</div>';

        html += '</div>'; // .phone
        html += '</div>'; // .nsc

        return html;
    },

    /** Initialize wizard navigation for a preview instance.
     *  Call this after inserting the wizardPreview HTML into the DOM.
     */
    initWizardNav: function(phoneEl) {
        var track = phoneEl.querySelector('[data-wiz-track]');
        var stepLabel = phoneEl.querySelector('[data-wiz-step]');
        var progTrack = phoneEl.querySelector('[data-wiz-prog]');
        var prevBtn = phoneEl.querySelector('[data-wiz-prev]');
        var nextBtn = phoneEl.querySelector('[data-wiz-next]');
        var cards = track.querySelectorAll('.wiz-card');
        var totalSteps = cards.length;
        var currentStep = 0;

        function go(step) {
            currentStep = Math.max(0, Math.min(totalSteps - 1, step));
            track.style.transform = 'translateX(-' + (currentStep * 100) + '%)';
            stepLabel.textContent = 'Steg ' + (currentStep + 1) + ' / ' + totalSteps;
            prevBtn.disabled = currentStep === 0;

            var isLast = currentStep === totalSteps - 1;
            nextBtn.className = 'nb ' + (isLast ? 'nb-submit' : 'nb-next');
            nextBtn.innerHTML = isLast ? 'Skicka in &#10003;' : 'NÄSTA &#8594;';

            // Update progress segments
            var segs = progTrack.querySelectorAll('.prog-seg');
            for (var i = 0; i < segs.length; i++) {
                segs[i].className = 'prog-seg';
                if (i < currentStep) segs[i].classList.add('done');
                else if (i === currentStep) segs[i].classList.add('active');
                else segs[i].classList.add('empty');
            }

            // Scroll card to top
            cards[currentStep].scrollTop = 0;
        }

        prevBtn.addEventListener('click', function() { go(currentStep - 1); });
        nextBtn.addEventListener('click', function() {
            if (currentStep < totalSteps - 1) go(currentStep + 1);
        });

        // Allow clicking progress segments
        var segs = progTrack.querySelectorAll('.prog-seg');
        segs.forEach(function(seg, idx) {
            seg.addEventListener('click', function() { go(idx); });
        });

        go(0);

        // ── Interactive control handlers (delegated) ──
        phoneEl.addEventListener('click', function(e) {
            var tri = e.target.closest('.tri');
            if (tri) {
                var stack = tri.parentElement;
                var tris = stack.querySelectorAll('.tri');
                var states = ['s-ok', 's-fail', 's-na'];
                tris.forEach(function(t) { t.classList.remove('s-ok', 's-fail', 's-na'); });
                var idx = Array.prototype.indexOf.call(tris, tri);
                tri.classList.add(states[idx] || 's-ok');
                return;
            }
            var bin = e.target.closest('.bin');
            if (bin) {
                var row = bin.parentElement;
                var bins = row.querySelectorAll('.bin');
                bins.forEach(function(b) { b.classList.remove('s-yes', 's-no'); });
                var idx = Array.prototype.indexOf.call(bins, bin);
                bin.classList.add(idx === 0 ? 's-yes' : 's-no');
                return;
            }
            var conf = e.target.closest('.conf');
            if (conf) {
                conf.classList.toggle('on');
                return;
            }
        });

        // ── Keyboard navigation ──
        phoneEl.setAttribute('tabindex', '0');
        phoneEl.style.outline = 'none';
        phoneEl.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                if (currentStep < totalSteps - 1) go(currentStep + 1);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (currentStep > 0) go(currentStep - 1);
            }
        });
        phoneEl.focus();
    },

    // ── Legacy methods (kept for backward compatibility) ──

    field: function(f, index, totalAnswerable) {
        var html = '';

        if (f.type === 'Header') {
            html += '<div class="card-label" style="margin-top:16px;">' + f.name + '</div>';
            return html;
        }

        if (f.type === 'Info') {
            html += '<div class="info-block"><div class="info-block-title">&#9432; ' + (f.name || 'Information') + '</div>';
            if (f.hint) html += '<div class="info-block-text">' + f.hint + '</div>';
            html += '</div>';
            return html;
        }

        html += '<div class="nbadge">' + index + ' / ' + totalAnswerable + '</div>';
        html += '<div class="card-q">' + f.name;
        if (f.req) html += '<span class="req-dot"></span>';
        html += '</div>';
        if (f.hint) html += '<div class="card-hint">' + f.hint + '</div>';

        html += NSRender.fieldControl(f);

        if (['Signature', 'Confirm', 'Repeater'].indexOf(f.type) < 0) {
            html += '<div class="attach-chips">';
            html += '<div class="attach-chip"><span class="attach-chip-icon">&#128172;</span> Kommentar</div>';
            if (!f.photo) html += '<div class="attach-chip"><span class="attach-chip-icon">&#128247;</span> Foto</div>';
            else html += '<div class="attach-chip required"><span class="attach-chip-icon">&#128247;</span> Foto krävs</div>';
            html += '</div>';
        }

        html += '<div style="height:1px;background:var(--b);margin:20px 0;"></div>';
        return html;
    },

    allFields: function(template) {
        var html = '';
        var answerableCount = template.fields.filter(function(f) {
            return f.type !== 'Header' && f.type !== 'Info';
        }).length;
        var answerIdx = 0;
        template.fields.forEach(function(f) {
            if (f.type !== 'Header' && f.type !== 'Info') answerIdx++;
            html += NSRender.field(f, answerIdx, answerableCount);
        });
        return html;
    },

    phoneFrame: function(templateName, docNumber, category, fieldsHtml, totalSteps) {
        var progSegs = '';
        for (var s = 0; s < totalSteps; s++) {
            progSegs += '<div class="prog-seg' + (s === 0 ? ' active' : ' empty') + '"></div>';
        }
        return '<div class="phone" style="width:390px;height:844px;max-height:none;">' +
            '<div class="sbar"><span>09:45</span><span>NSChecks</span><span>78%</span></div>' +
            '<div class="wiz-header">' +
                '<div class="wiz-header-top">' +
                    '<div class="app-bar-back" style="width:36px;height:36px;cursor:default;">&#8592;</div>' +
                    '<svg viewBox="0 0 15 20" width="12" height="16" style="flex-shrink:0;"><rect x="0" y="15.5" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="5.25" y="10.25" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="10.5" y="5" width="4.5" height="4.5" fill="#2E9E5F"/><rect x="5.25" y="0" width="4.5" height="4.5" fill="rgba(46,158,95,0.5)"/></svg>' +
                    '<div class="wiz-header-info">' +
                        '<div class="wiz-title">' + templateName + '</div>' +
                        '<div class="wiz-sub">' + docNumber + ' &middot; ' + category + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="wiz-header-row2">' +
                    '<div class="step-counter">Steg 1 / ' + totalSteps + '</div>' +
                '</div>' +
                '<div class="prog-track">' + progSegs + '</div>' +
            '</div>' +
            '<div style="flex:1;overflow-y:auto;padding:20px;">' + fieldsHtml + '</div>' +
            '<div class="bnav">' +
                '<button class="nb nb-prev" disabled>&#8592;</button>' +
                '<button class="nb nb-next">NÄSTA &#8594;</button>' +
            '</div>' +
        '</div>';
    }
};
