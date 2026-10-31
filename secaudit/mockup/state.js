/* ============================================================
   SecAudit mockup — application state
   Single source of truth: audits, findings, comments, framework
   mapping, trends, undo log.
   ============================================================ */

(function () {
    'use strict';

    /* ----- Audits with customer logo + previous audit pointer ----- */

    window.AUDITS = [
        {
            id: 1, customer: 'Acme Holdings AB', tenant: 'acme-prod.onmicrosoft.com',
            started: '2026-04-22', lastActivity: '14 min ago',
            checked: 147, status: 'In progress', badge: 'badge-blue',
            logoId: 'l-acme', previousAuditId: 7,
            catalogVersion: '2026.04', reviewer: 'peter@kalmstrom.com',
            tenants: ['acme-prod.onmicrosoft.com', 'acme-dev.onmicrosoft.com']
        },
        {
            id: 2, customer: 'Bergström Logistics', tenant: 'bergstrom.onmicrosoft.com',
            started: '2026-04-08', lastActivity: '2 days ago',
            checked: 599, status: 'Review', badge: 'badge-orange',
            logoId: 'l-bergstrom', previousAuditId: null,
            catalogVersion: '2026.04', reviewer: 'peter@kalmstrom.com'
        },
        {
            id: 3, customer: 'Nordic Capital Partners', tenant: 'nordiccap.onmicrosoft.com',
            started: '2026-03-30', lastActivity: '5 hours ago',
            checked: 387, status: 'In progress', badge: 'badge-blue',
            logoId: 'l-nordic', previousAuditId: null,
            catalogVersion: '2026.04', reviewer: 'erik@kalmstrom.com'
        },
        {
            id: 4, customer: 'Vasa Energi', tenant: 'vasaenergi.onmicrosoft.com',
            started: '2026-02-11', lastActivity: '6 weeks ago',
            checked: 624, status: 'Delivered', badge: 'badge-green',
            logoId: 'l-vasa', previousAuditId: null,
            catalogVersion: '2026.01', reviewer: 'peter@kalmstrom.com'
        },
        {
            id: 5, customer: 'Mälar Property Group', tenant: 'malar.onmicrosoft.com',
            started: '2026-01-18', lastActivity: '3 months ago',
            checked: 624, status: 'Delivered', badge: 'badge-green',
            logoId: 'l-malar', previousAuditId: null,
            catalogVersion: '2026.01', reviewer: 'peter@kalmstrom.com'
        },
        {
            id: 6, customer: 'Karolinska Pharma', tenant: 'karolinskapharma.onmicrosoft.com',
            started: '2025-12-04', lastActivity: '5 months ago',
            checked: 624, status: 'Delivered', badge: 'badge-green',
            logoId: 'l-karolinska', previousAuditId: null,
            catalogVersion: '2025.10', reviewer: 'erik@kalmstrom.com'
        },
        {
            id: 7, customer: 'Acme Holdings AB', tenant: 'acme-prod.onmicrosoft.com',
            started: '2025-04-15', lastActivity: '12 months ago',
            checked: 580, status: 'Delivered', badge: 'badge-green',
            logoId: 'l-acme', previousAuditId: null, archived: true,
            catalogVersion: '2025.04', reviewer: 'peter@kalmstrom.com'
        }
    ];

    /* ----- Current Acme audit findings (35 across 12 categories) ----- */
    /* Lifecycle states for failed items: open, acknowledged, accepted, remediating, verified */

    window.FINDINGS = {
        1:  { status: 'pass', risk: 'none', observation: '142 service principals inventoried via Get-MgServicePrincipal. 7 orphans flagged for review (no owner, no recent sign-in).', evidence: ['sp-inventory-2026-04-30.csv'], checkedAt: '2026-04-22' },
        2:  { status: 'fail', risk: 'high', observation: '3 enterprise apps hold Directory.ReadWrite.All without owner. Two were granted in 2023 by an admin who has since left.', evidence: ['ent-apps-d-rw-all.png', 'graph-query.txt'], checkedAt: '2026-04-30',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-06-15' } },
        3:  { status: 'fail', risk: 'med',  observation: 'Mix of secrets and certs. 4 secrets > 180 days old; rotation plan needed.', evidence: ['secret-cert-audit.xlsx'], checkedAt: '2026-04-25',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-30' } },
        4:  { status: 'pass', risk: 'none', observation: 'Two app secrets expire in next 30 days. Owners notified, replacement certs being generated.', evidence: ['expiring-creds.txt'], checkedAt: '2026-04-25' },
        5:  { status: 'na',   risk: 'none', observation: 'Customer is not yet using federated identity for any first-party app. Optional improvement noted in remediation plan.', checkedAt: '2026-04-22' },
        7:  { status: 'pass', risk: 'none', observation: 'Service principal admin consents reviewed quarterly via Entra Enterprise apps. Last review 2026-03-18.', checkedAt: '2026-04-23' },
        8:  { status: 'fail', risk: 'high', observation: 'Illicit consent monitoring not configured. AzureADIncidentResponse cmdlets not run; no Defender alerts wired up.', evidence: ['no-icl-monitor.txt'], checkedAt: '2026-04-23',
              lifecycle: { state: 'open' } },
        12: { status: 'pass', risk: 'none', observation: 'Migration to consolidated authentication-methods policy completed 2025-09. Legacy MFA/SSPR policies retired.', checkedAt: '2026-04-24' },
        13: { status: 'fail', risk: 'high', observation: 'Phishing-resistant methods (FIDO2, WHfB) not enabled for any admin account. Authenticator push only.', evidence: ['auth-methods-policy.json'], checkedAt: '2026-04-24',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-07-01' } },
        14: { status: 'fail', risk: 'med',  observation: 'SMS/Voice still enabled tenant-wide. 38 users have only SMS as their MFA method.', evidence: ['sms-only-users.csv'], checkedAt: '2026-04-24',
              lifecycle: { state: 'acknowledged' } },
        15: { status: 'pass', risk: 'none', observation: 'Number matching enabled (default since 2023-02). Verified via Authenticator settings blade.', checkedAt: '2026-04-24' },
        17: { status: 'fail', risk: 'high', observation: 'Legacy auth not blocked tenant-wide. CA policy "Block Legacy Auth" present but in report-only mode. 412 sign-ins in last 30 days using legacy clients.', evidence: ['legacy-auth-signins.csv'], checkedAt: '2026-04-29',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-15' } },
        20: { status: 'fail', risk: 'med',  observation: 'MFA registration coverage 87% — 38 of 295 licensed users not registered.', evidence: ['mfa-coverage.png'], checkedAt: '2026-04-25',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-30' } },
        21: { status: 'pass', risk: 'none', observation: 'AKS cluster has Azure RBAC + Entra integration enabled. No local kubeconfig files in use.', checkedAt: '2026-04-26' },
        22: { status: 'pass', risk: 'none', observation: 'disable-local-accounts = true on all 3 AKS clusters.', checkedAt: '2026-04-26' },
        24: { status: 'fail', risk: 'high', observation: 'Public API server on 2 of 3 AKS clusters; private cluster not configured for prod-east.', evidence: ['aks-config.json'], checkedAt: '2026-04-27',
              lifecycle: { state: 'accepted', justification: 'Customer requires public API for partner integration. Compensating control: authorizedIpRanges restricted to corp egress and partner allowlist.', signedBy: 'CTO Anna Lindqvist', signedAt: '2026-04-28', expiresAt: '2027-04-28' } },
        25: { status: 'fail', risk: 'med',  observation: 'authorizedIpRanges set to 0.0.0.0/0 on prod-east AKS cluster.', checkedAt: '2026-04-27',
              lifecycle: { state: 'remediating', owner: 'platform-team@acme.se', targetDate: '2026-05-12' } },
        38: { status: 'na',   risk: 'none', observation: 'Customer does not use Azure Arc for any on-prem servers.', checkedAt: '2026-04-22' },
        44: { status: 'pass', risk: 'none', observation: 'Recovery Services vaults configured with soft delete + immutable backup policies.', checkedAt: '2026-04-26' },
        52: { status: 'pass', risk: 'none', observation: 'CMK enabled on storage accounts containing customer data.', checkedAt: '2026-04-26' },
        67: { status: 'fail', risk: 'med',  observation: 'No baseline CA policy requiring MFA for all users — only admin policy in place.', evidence: ['ca-policies.json'], checkedAt: '2026-04-29',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-15' } },
        68: { status: 'fail', risk: 'high', observation: 'No CA policy blocking legacy authentication — same as item #17. Tracked together.', evidence: ['ca-policies.json'], checkedAt: '2026-04-29',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-15' } },
        70: { status: 'pass', risk: 'none', observation: 'Geo-blocking CA policy in place: countries outside SE/NO/DK/FI blocked unless trusted device.', checkedAt: '2026-01-12' },
        77: { status: 'fail', risk: 'high', observation: 'Defender for Cloud Apps governance not configured. OAuth apps not monitored. ~85 third-party apps connected.', checkedAt: '2026-04-28',
              lifecycle: { state: 'open' } },
        78: { status: 'pass', risk: 'none', observation: 'Defender for Endpoint deployed to all 412 Windows endpoints; macOS rollout 89% complete.', checkedAt: '2026-04-28' },
        85: { status: 'fail', risk: 'med',  observation: '4 Windows endpoints have ASR rules in audit-only mode for over 90 days.', checkedAt: '2026-01-15',
              lifecycle: { state: 'remediating', owner: 'platform-team@acme.se', targetDate: '2026-06-01' } },
        92: { status: 'pass', risk: 'none', observation: 'Intune compliance policies cover all platforms (Windows, iOS, Android, macOS).', checkedAt: '2026-04-23' },
        110: { status: 'fail', risk: 'low',  observation: 'Some PIM-eligible roles still permanently assigned (4 users have permanent Global Admin). Customer is migrating.', evidence: ['pim-config.png'], checkedAt: '2026-04-25',
              lifecycle: { state: 'remediating', owner: 'henrik@acme.se', targetDate: '2026-05-31' } },
        130: { status: 'pass', risk: 'none', observation: 'Sharing externally restricted to authenticated guests + per-site allow-list.', checkedAt: '2026-04-22' },
        145: { status: 'fail', risk: 'med',  observation: 'OneDrive retention policy not aligned with new 7-year requirement; currently 5 years.', checkedAt: '2026-04-29',
              lifecycle: { state: 'acknowledged' } },
        158: { status: 'pass', risk: 'none', observation: 'Teams external access restricted to allow-listed domains.', checkedAt: '2026-04-22' },
        180: { status: 'fail', risk: 'high', observation: 'No DLP policies for credit card / PII in Exchange Online. Test email with sample CC# delivered without quarantine.', evidence: ['dlp-test.eml'], checkedAt: '2026-04-27',
              lifecycle: { state: 'remediating', owner: 'compliance@acme.se', targetDate: '2026-06-30' } },
        220: { status: 'pass', risk: 'none', observation: 'Sentinel workspace receiving Entra ID, Defender, Office 365, and Azure activity logs.', checkedAt: '2026-04-23' },
        260: { status: 'fail', risk: 'low',  observation: 'Power Platform DLP policy is permissive — connectors not categorized into business/non-business.', checkedAt: '2026-04-25',
              lifecycle: { state: 'accepted', justification: 'Power Platform usage limited to two approved makers. Risk reviewed and accepted; revisit on next audit.', signedBy: 'CTO Anna Lindqvist', signedAt: '2026-04-26', expiresAt: '2027-04-26' } },
        310: { status: 'na',   risk: 'none', observation: 'Customer has not yet rolled out M365 Copilot.', checkedAt: '2026-04-22' }
    };

    /* ----- Acme 2025 (previous audit) findings — used for diff ----- */

    window.PREV_FINDINGS = {
        1:  { status: 'pass', risk: 'none', observation: '128 service principals inventoried.' },
        2:  { status: 'fail', risk: 'high', observation: '5 enterprise apps with Directory.ReadWrite.All — 2 unowned.' },
        3:  { status: 'fail', risk: 'high', observation: '11 secrets > 180 days old; no rotation policy.' },
        4:  { status: 'pass', risk: 'none', observation: 'No expiring creds in 30 days at time of audit.' },
        7:  { status: 'fail', risk: 'med',  observation: 'No regular review of admin consents.' },
        8:  { status: 'fail', risk: 'high', observation: 'Illicit consent monitoring not in place.' },
        12: { status: 'fail', risk: 'med',  observation: 'Authentication-methods migration not started; legacy MFA policies in use.' },
        13: { status: 'fail', risk: 'high', observation: 'Phishing-resistant MFA not available.' },
        14: { status: 'fail', risk: 'high', observation: 'SMS as primary MFA for 78 users.' },
        15: { status: 'fail', risk: 'med',  observation: 'Number matching not yet enabled.' },
        17: { status: 'fail', risk: 'high', observation: 'Legacy auth not blocked.' },
        20: { status: 'fail', risk: 'high', observation: 'MFA coverage 64%.' },
        21: { status: 'fail', risk: 'med',  observation: 'AKS cluster on local kubeconfig — Azure RBAC not enabled.' },
        24: { status: 'fail', risk: 'high', observation: 'Public AKS API on all 3 clusters.' },
        67: { status: 'fail', risk: 'high', observation: 'No CA policies in place — only the default security defaults.' },
        70: { status: 'fail', risk: 'med',  observation: 'No geo-blocking.' },
        77: { status: 'fail', risk: 'high', observation: 'No Defender for Cloud Apps governance.' },
        78: { status: 'fail', risk: 'med',  observation: 'Defender for Endpoint coverage 70%; macOS not deployed.' },
        85: { status: 'fail', risk: 'high', observation: 'ASR rules not enabled.' },
        92: { status: 'fail', risk: 'high', observation: 'Intune compliance policies missing for macOS/iOS.' },
        110: { status: 'fail', risk: 'high', observation: 'PIM not in use; all admin roles permanent.' },
        130: { status: 'fail', risk: 'med',  observation: 'External sharing wide open.' },
        145: { status: 'fail', risk: 'med',  observation: 'OneDrive retention 1 year only.' },
        158: { status: 'fail', risk: 'med',  observation: 'Teams external access fully open.' },
        180: { status: 'fail', risk: 'high', observation: 'No DLP policies anywhere.' },
        220: { status: 'fail', risk: 'high', observation: 'No Sentinel deployed.' },
        260: { status: 'na',   risk: 'none', observation: 'Power Platform not in use a year ago.' }
    };

    /* ----- Comments per finding (mocked) ----- */

    window.COMMENTS = {
        2: [
            { author: 'peter@kalmstrom.com', date: '2026-04-30 14:02', text: 'Customer confirms the two unowned apps are no longer in use. Recommending removal.' },
            { author: 'erik@kalmstrom.com',  date: '2026-04-30 14:38', text: 'Agreed — flag this as remediation priority 1. I will coordinate with the customer admin tomorrow.' }
        ],
        17: [
            { author: 'peter@kalmstrom.com', date: '2026-04-29 16:12', text: '412 legacy sign-ins is concerning. Most appear to be from 2 service accounts using SMTP AUTH for line-of-business app.' },
            { author: 'customer@acme.se',     date: '2026-04-30 09:01', text: 'We are aware. App vendor has updated to OAuth — rolling out next sprint.' }
        ],
        77: [
            { author: 'erik@kalmstrom.com', date: '2026-04-28 11:45', text: '85 third-party OAuth apps is high. Recommend Defender for Cloud Apps trial.' }
        ],
        180: [
            { author: 'peter@kalmstrom.com', date: '2026-04-27 10:22', text: 'Test email with sample 4111-1111-1111-1111 delivered to mailbox. Replicating to confirm no DLP at all.' }
        ]
    };

    /* ----- Compliance framework mapping (~50 items seeded) ----- */

    window.FRAMEWORK_MAP = {
        1:   { iso: 'A.8.2', cis: '1.1.1', nist: 'PR.AC-1' },
        2:   { iso: 'A.8.2', cis: '1.1.4', nist: 'PR.AC-4' },
        3:   { iso: 'A.8.24', cis: '1.4.1', nist: 'PR.AC-1' },
        4:   { iso: 'A.8.24', cis: '1.4.1', nist: 'PR.AC-1' },
        5:   { iso: 'A.8.5', cis: '1.4.5', nist: 'PR.AC-7' },
        7:   { iso: 'A.5.18', cis: '1.1.6', nist: 'PR.AC-3' },
        8:   { iso: 'A.5.7', cis: '1.1.5', nist: 'DE.CM-1' },
        12:  { iso: 'A.8.5', cis: '1.1.1', nist: 'PR.AC-7' },
        13:  { iso: 'A.8.5', cis: '1.1.2', nist: 'PR.AC-7' },
        14:  { iso: 'A.8.5', cis: '1.1.3', nist: 'PR.AC-7' },
        15:  { iso: 'A.8.5', cis: '1.1.2', nist: 'PR.AC-7' },
        17:  { iso: 'A.8.5', cis: '1.1.7', nist: 'PR.AC-1' },
        20:  { iso: 'A.8.5', cis: '1.1.1', nist: 'PR.AC-7' },
        21:  { iso: 'A.8.4', cis: '5.1.1', nist: 'PR.AC-4' },
        22:  { iso: 'A.8.4', cis: '5.1.2', nist: 'PR.AC-1' },
        24:  { iso: 'A.8.20', cis: '5.1.5', nist: 'PR.AC-5' },
        25:  { iso: 'A.8.20', cis: '5.1.5', nist: 'PR.AC-5' },
        38:  { iso: 'A.8.9', cis: '6.1.1', nist: 'ID.AM-1' },
        44:  { iso: 'A.8.13', cis: '11.1', nist: 'PR.IP-4' },
        52:  { iso: 'A.8.24', cis: '3.6.4', nist: 'PR.DS-1' },
        67:  { iso: 'A.5.15', cis: '1.2.1', nist: 'PR.AC-1' },
        68:  { iso: 'A.5.15', cis: '1.2.4', nist: 'PR.AC-1' },
        70:  { iso: 'A.5.15', cis: '1.2.7', nist: 'PR.AC-3' },
        77:  { iso: 'A.5.7', cis: '8.10', nist: 'DE.CM-7' },
        78:  { iso: 'A.8.7', cis: '8.1', nist: 'DE.CM-4' },
        85:  { iso: 'A.8.7', cis: '8.7', nist: 'PR.IP-1' },
        92:  { iso: 'A.8.1', cis: '9.1', nist: 'PR.AC-3' },
        110: { iso: 'A.8.2', cis: '1.3.1', nist: 'PR.AC-1' },
        130: { iso: 'A.5.10', cis: '6.2.1', nist: 'PR.DS-5' },
        145: { iso: 'A.5.33', cis: '6.4.1', nist: 'PR.IP-4' },
        158: { iso: 'A.5.10', cis: '7.1.1', nist: 'PR.AC-3' },
        180: { iso: 'A.5.34', cis: '6.5.1', nist: 'PR.DS-5' },
        220: { iso: 'A.8.16', cis: '8.11', nist: 'DE.CM-1' },
        260: { iso: 'A.5.7', cis: '6.6.1', nist: 'PR.AC-4' },
        310: { iso: 'A.5.7', cis: '8.12', nist: 'PR.AC-4' }
    };

    /* ----- Per-category trend data (4-audit history) ----- */

    window.TREND_DATA = {
        'Applications & Service Principals': [40, 50, 65, 70],
        'Authentication & MFA':               [22, 35, 55, 67],
        'Conditional Access':                 [15, 30, 50, 62],
        'Defender (extended)':                [35, 45, 70, 74],
        'Defender XDR':                       [30, 40, 65, 72],
        'Identity & Access (extended)':       [42, 55, 60, 68],
        'Privileged Access':                  [10, 25, 45, 55],
        'Exchange Online':                    [55, 60, 65, 70],
        'SharePoint & OneDrive':              [60, 65, 70, 75],
        'Sentinel (extended)':                [0,  20, 50, 60],
        'Microsoft Teams':                    [50, 55, 65, 70],
        'Purview (extended)':                 [25, 35, 50, 58],
        'Endpoint Management (Intune)':       [45, 55, 70, 78],
        'Logging & Monitoring':               [20, 30, 50, 62],
        'Azure Networking':                   [50, 60, 65, 70]
    };

    /* ----- Recent activity (rebuilt from FINDINGS + COMMENTS) ----- */

    window.ACTIVITY = [
        { time: '14:02', actor: 'peter@kalmstrom.com', kind: 'comment',
          itemId: 2, text: 'commented on Apps with Directory.ReadWrite.All' },
        { time: '13:48', actor: 'peter@kalmstrom.com', kind: 'evidence',
          itemId: 17, text: 'attached evidence ca-baseline-2026-04-30.png to Conditional Access · Baseline policies' },
        { time: '13:30', actor: 'peter@kalmstrom.com', kind: 'fail',
          itemId: 17, text: 'marked Legacy authentication blocked as Fail (high risk)' },
        { time: '11:17', actor: 'peter@kalmstrom.com', kind: 'cmd',
          itemId: 1, text: 'ran Get-MgServicePrincipal — 142 service principals returned' },
        { time: '10:55', actor: 'peter@kalmstrom.com', kind: 'open',
          text: 'opened audit Acme Holdings AB' },
        { time: 'Yesterday', actor: 'erik@kalmstrom.com', kind: 'comment',
          itemId: 77, text: 'commented on Risky third-party apps' },
        { time: 'Yesterday', actor: 'system', kind: 'sync',
          text: 're-imported reference catalog — 624 items across 61 categories (catalog version 2026.04)' }
    ];

    /* ----- In-memory undo log ----- */

    window.UNDO_LOG = [];

    /* ----- Cross-customer portfolio benchmarks ----- */
    /* Per-category pass-rate (median, q1, q3, top quartile, n=audits) across delivered engagements. */

    window.BENCHMARKS = {
        'Applications & Service Principals': { median: 71, q1: 52, q3: 84, top: 95, n: 14 },
        'Authentication & MFA':               { median: 78, q1: 60, q3: 92, top: 100, n: 14 },
        'Azure AKS/Containers':               { median: 64, q1: 38, q3: 82, top: 96, n: 8 },
        'Azure Storage':                      { median: 80, q1: 65, q3: 92, top: 100, n: 14 },
        'Azure Networking':                   { median: 70, q1: 52, q3: 86, top: 95, n: 14 },
        'Conditional Access':                 { median: 76, q1: 58, q3: 90, top: 98, n: 14 },
        'Defender (extended)':                { median: 68, q1: 45, q3: 84, top: 95, n: 14 },
        'Defender XDR':                       { median: 72, q1: 50, q3: 86, top: 95, n: 14 },
        'Endpoint Management (Intune)':       { median: 82, q1: 70, q3: 92, top: 100, n: 14 },
        'Exchange Online':                    { median: 78, q1: 65, q3: 90, top: 100, n: 14 },
        'Identity & Access (extended)':       { median: 71, q1: 55, q3: 86, top: 96, n: 14 },
        'Identity & Access Management':       { median: 80, q1: 65, q3: 92, top: 100, n: 14 },
        'Logging & Monitoring':               { median: 64, q1: 42, q3: 80, top: 96, n: 14 },
        'Microsoft Teams':                    { median: 76, q1: 60, q3: 88, top: 100, n: 14 },
        'Privileged Access':                  { median: 58, q1: 38, q3: 78, top: 92, n: 14 },
        'Purview (extended)':                 { median: 60, q1: 40, q3: 78, top: 92, n: 14 },
        'Purview Compliance':                 { median: 64, q1: 45, q3: 82, top: 95, n: 14 },
        'Sentinel (extended)':                { median: 60, q1: 30, q3: 82, top: 96, n: 11 },
        'SharePoint & OneDrive':              { median: 78, q1: 62, q3: 90, top: 100, n: 14 }
    };

    /* ----- Items requiring customer interview (process / policy / training) ----- */
    /* Item IDs that can't be answered from Graph alone — they need the customer to confirm. */

    window.INTERVIEW_IDS = [
        99, 100, 101, 102, 103, 104, 105, 106,
        125, 126, 127, 128, 129, 131, 133, 134, 135, 136, 137, 138, 139, 140,
        191, 192, 193, 194, 195, 196,
        323, 324, 325, 326, 327, 328, 329, 330, 331, 332, 333,
        420, 421, 422, 423, 424, 425
    ];

    /* ----- Customer interview answers (mocked) ----- */

    window.INTERVIEW_ANSWERS = {
        99:  { answer: 'yes',     notes: 'Reviewed quarterly by IT-Sec lead. Documented in Confluence.', answeredBy: 'Henrik (IT-Sec lead)', answeredAt: '2026-04-26' },
        100: { answer: 'partial', notes: 'Process exists but training has not been refreshed since 2024.', answeredBy: 'Henrik', answeredAt: '2026-04-26' },
        101: { answer: 'no',      notes: 'No formal incident-response plan documented yet. Plan to develop one by Q3.', answeredBy: 'Anna (CTO)', answeredAt: '2026-04-28' },
        102: { answer: 'yes',     notes: 'Quarterly DR test, last completed 2026-03-15.', answeredBy: 'Henrik', answeredAt: '2026-04-26' },
        125: { answer: 'partial', notes: 'Onboarding/offboarding documented but executed manually; automation planned.', answeredBy: 'Anna', answeredAt: '2026-04-28' },
        191: { answer: 'no',      notes: 'No recurring phishing simulation programme.', answeredBy: 'Anna', answeredAt: '2026-04-28' }
    };

    /* ----- LLM-mocked remediation templates per product domain ----- */

    window.LLM_REMEDIATION = {
        'p-entra': 'Open Entra ID admin center → Authentication methods → Policies. Enable phishing-resistant methods (FIDO2, Windows Hello for Business, certificate-based) for the "Privileged Roles" group first. Pilot with 5 admins for 2 weeks, then enforce for all admin scopes via a Conditional Access policy requiring authenticationStrengths = "phishingResistantMfa". Disable SMS/Voice for all-users group in the same blade. Verify by attempting sign-in with a non-phishing-resistant method as a privileged user; sign-in should be blocked. Estimated effort: 1 week. Owner: identity team.',
        'p-defender': 'Open Microsoft Defender portal → Cloud apps → OAuth apps. Enable governance and configure auto-revoke policies for high-risk OAuth grants. Connect Defender for Cloud Apps to Microsoft 365 if not already connected (Settings → Cloud apps → Connected apps). Review the 85 third-party apps and revoke or scope down those with broad Graph permissions. Set up an alert policy for new high-risk OAuth grants. Estimated effort: 2-3 days. Owner: security team.',
        'p-azure': 'For each AKS cluster with public API server, evaluate whether private cluster is feasible. If yes: re-deploy as private cluster (downtime required). If no: restrict authorizedIpRanges to corporate egress and any required partner ranges. Verify with `az aks show --query apiServerAccessProfile`. For prod-east specifically, replace 0.0.0.0/0 with the corp NAT egress range and any approved partner ranges. Document the exception in the risk register if private cluster cannot be adopted. Estimated effort: 4 hours per cluster. Owner: platform team.',
        'p-purview': 'Open Microsoft Purview → Data loss prevention → Policies. Create a baseline DLP policy targeting Exchange Online, SharePoint, OneDrive, and Teams. Use the built-in templates for "Financial Data" and "PII" as starting points. Set actions: block share, notify user, audit. Roll out in test mode first (audit-only) for two weeks, review false positives, then switch to enforce. Verify by sending a test email containing a sample credit card number to an external recipient — should be blocked. Estimated effort: 1 week. Owner: compliance team.',
        'default': 'Open the relevant admin portal for this control area. Configure the recommended setting per Microsoft baseline guidance. Test with a representative user / resource. Document the change in the customer\'s configuration register. Re-run the catalog check to verify the finding moves to Pass. Estimated effort: 2-4 hours. Owner: customer admin team.'
    };

    /* ----- Catalog versions and deltas ----- */
    /* Tracks what changed between catalog versions so an audit on an older
       version can show "12 new items, 3 changed, 1 removed since you last ran". */

    window.CATALOG_VERSIONS = [
        { id: '2025.04', releasedAt: '2025-04-01', itemCount: 580 },
        { id: '2025.10', releasedAt: '2025-10-15', itemCount: 602 },
        { id: '2026.01', releasedAt: '2026-01-20', itemCount: 615 },
        { id: '2026.04', releasedAt: '2026-04-15', itemCount: 624 }
    ];

    /* Per-version deltas vs the immediately previous version. Mocked subset. */
    window.CATALOG_DELTAS = {
        '2026.04': {
            from: '2026.01',
            added: [
                { id: 310, reason: 'M365 Copilot — new domain, 9 controls added' },
                { id: 191, reason: 'Phishing simulation programme — recurring control' },
                { id: 192, reason: 'Security awareness refresh tracking' },
                { id: 423, reason: 'Insider risk policy thresholds (Purview)' }
            ],
            changed: [
                { id: 13,  reason: 'Authentication strengths: phishing-resistant now baseline (was optional)' },
                { id: 17,  reason: 'Block legacy auth — exception list field added' },
                { id: 24,  reason: 'AKS public API — authorizedIpRanges now mandatory if public' }
            ],
            removed: [
                { id: 999, reason: 'Legacy MFA per-user policy — replaced by 13/14/15 unified flow' }
            ]
        },
        '2026.01': {
            from: '2025.10',
            added: [
                { id: 220, reason: 'Sentinel data connectors — discrete checks per source' }
            ],
            changed: [],
            removed: []
        },
        '2025.10': { from: '2025.04', added: [], changed: [], removed: [] }
    };

    /* ----- Per-tenant scoping ----- */
    /* Acme has two tenants — prod and dev. Mocked assignment of findings to tenants. */
    window.TENANT_ASSIGNMENT = {
        /* Default = 'acme-prod.onmicrosoft.com' for all not listed */
        21: 'acme-dev.onmicrosoft.com',
        22: 'acme-dev.onmicrosoft.com',
        24: 'acme-dev.onmicrosoft.com',
        25: 'acme-dev.onmicrosoft.com'
    };

    /* ----- LLM-mocked customer-language translations ----- */

    window.LLM_TRANSLATION = {
        'p-entra':    'Some of your administrator accounts can still sign in using older, weaker methods (passwords + SMS codes). These are vulnerable to phishing. We recommend switching admin accounts to a phishing-resistant method (a security key or Windows Hello) before the end of next quarter.',
        'p-defender': 'Your tenant has 85 connected third-party apps with various permissions, but no automated review process. We recommend turning on the built-in governance feature that flags risky apps automatically and alerts your team when a user grants broad access.',
        'p-azure':    'Two of your three Kubernetes clusters expose their management endpoint to the public internet, which is more accessible than is typical for production workloads. We recommend either making the endpoint private, or restricting access to your corporate IP ranges only.',
        'p-purview':  'Your tenant doesn\'t currently scan emails or shared documents for sensitive content like credit cards or personal data. This means accidental leaks could go unnoticed. We recommend turning on a baseline data-loss-prevention policy that audits and warns on these exposures.',
        'default':    'This control isn\'t configured to current Microsoft baseline. The remediation is straightforward and we\'ve outlined the steps in the technical findings; recommend addressing within your normal change cycle.'
    };

})();
