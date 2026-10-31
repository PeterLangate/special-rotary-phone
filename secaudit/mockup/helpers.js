/* ============================================================
   SecAudit mockup — shared helpers (icons, escape, formatting)
   Loaded before app.js. Exposes window.SA.
   ============================================================ */

(function () {
    'use strict';

    var SA = window.SA || {};

    /* ----- HTML escape + truncate ----------------------------- */

    SA.escape = function (s) {
        if (s === undefined || s === null) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    SA.truncate = function (s, n) {
        s = s || '';
        return s.length > n ? s.substring(0, n - 1) + '…' : s;
    };

    /* ----- SVG sprite refs ------------------------------------ */

    SA.svg = function (id, cls) {
        return '<svg class="icon ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
    };

    SA.PRODUCT_MAP = [
        { test: /^Applications & Service Principals|^Authentication & MFA|^Conditional Access|^CA \(|^Identity & Access|^B2B|^B2C|^Privileged Access|^PIM|^Hybrid Identity|^Workload Identity/i, id: 'p-entra' },
        { test: /^Defender XDR|^Defender \(|^MDE|^MDA|^MDI|^Threat Hunting|^Incident Response/i, id: 'p-defender' },
        { test: /^Sentinel/i, id: 'p-sentinel' },
        { test: /^Purview|^Records|^Information Protection|^Information Barriers|^Privacy|^Priva|^Compliance Manager|^Purview Compliance|^OME/i, id: 'p-purview' },
        { test: /^Endpoint Management|^Endpoint Privilege|^Mobile Devices|^Intune|^macOS|^Windows Hardening/i, id: 'p-intune' },
        { test: /^Exchange Online/i, id: 'p-exchange' },
        { test: /^SharePoint/i, id: 'p-sharepoint' },
        { test: /^Microsoft Teams|^Teams/i, id: 'p-teams' },
        { test: /^Azure/i, id: 'p-azure' },
        { test: /^Power Platform|^Power BI/i, id: 'p-power' },
        { test: /^M365 Apps/i, id: 'p-m365' },
        { test: /^M365 Copilot/i, id: 'p-copilot' },
        { test: /^Forms|^Bookings/i, id: 'p-forms' },
        { test: /^Viva|^Yammer/i, id: 'p-viva' },
        { test: /^Browser/i, id: 'p-browser' },
        { test: /^Logging|^Monitoring/i, id: 'p-monitor' },
        { test: /^Backup|^Recovery|^Update Management/i, id: 'p-backup' },
        { test: /^Tenant-wide/i, id: 'p-tenant' }
    ];

    SA.productIconId = function (category) {
        for (var i = 0; i < SA.PRODUCT_MAP.length; i++) {
            if (SA.PRODUCT_MAP[i].test.test(category)) return SA.PRODUCT_MAP[i].id;
        }
        return 'p-tenant';
    };

    SA.productIcon = function (category, cls) {
        return '<svg class="icon-product ' + (cls || 'icon-product-sm') + '" aria-hidden="true"><use href="#' + SA.productIconId(category) + '"/></svg>';
    };

    SA.statusIcon = function (status, cls) {
        var id = 's-' + (status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : status === 'na' ? 'na' : 'pending');
        var color = 'icon-' + (status === 'pass' ? 'pass' : status === 'fail' ? 'fail' : status === 'na' ? 'na' : 'pending');
        return '<svg class="icon ' + color + ' ' + (cls || 'item-status-svg') + '" aria-hidden="true"><use href="#' + id + '"/></svg>';
    };

    SA.statusBadgeClass = function (s) {
        return s === 'pass' ? 'badge-green' :
               s === 'fail' ? 'badge-red'   :
               s === 'na'   ? 'badge-gray'  :
                              'badge-teal';
    };
    SA.statusLabel = function (s) {
        return s === 'pass' ? 'Pass' :
               s === 'fail' ? 'Fail' :
               s === 'na'   ? 'N/A'  :
                              'Pending';
    };

    /* ----- Portal map (M365/Azure URL routing) ---------------- */

    SA.PORTAL_MAP = [
        { test: /^Applications & Service Principals/, label: 'Entra · App registrations',     url: 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade' },
        { test: /^Authentication & MFA/,              label: 'Entra · Authentication methods', url: 'https://entra.microsoft.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade' },
        { test: /^Conditional Access|^CA \(/,         label: 'Entra · Conditional Access',     url: 'https://entra.microsoft.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade' },
        { test: /^Identity & Access/,                 label: 'Entra · Identity',               url: 'https://entra.microsoft.com/#view/Microsoft_AAD_IAM/UsersManagementMenuBlade' },
        { test: /^Privileged Access|^PIM/,            label: 'Entra · Privileged Identity Mgmt', url: 'https://entra.microsoft.com/#view/Microsoft_Azure_PIMCommon/CommonMenuBlade' },
        { test: /^B2B|^B2C/,                          label: 'Entra · External Identities',    url: 'https://entra.microsoft.com/#view/Microsoft_AAD_IAM/CompanyRelationshipsMenuBlade' },
        { test: /^Hybrid Identity/,                   label: 'Entra · Hybrid Connect',         url: 'https://entra.microsoft.com/#view/Microsoft_AAD_Connect_Provisioning/AADConnectProvisioningMenuBlade' },
        { test: /^Workload Identity/,                 label: 'Entra · Workload identities',    url: 'https://entra.microsoft.com/#view/Microsoft_Azure_ManagedServiceIdentity/WorkloadIdentitiesBlade' },
        { test: /^Exchange Online/,                   label: 'Exchange admin center',          url: 'https://admin.exchange.microsoft.com/' },
        { test: /^SharePoint/,                        label: 'SharePoint admin center',        url: 'https://admin.microsoft.com/sharepoint' },
        { test: /^Microsoft Teams|^Teams/,            label: 'Teams admin center',             url: 'https://admin.teams.microsoft.com/' },
        { test: /^Defender XDR|^Defender \(|^MDE|^MDA|^MDI|^Threat Hunting|^Incident Response/, label: 'Microsoft Defender portal', url: 'https://security.microsoft.com/' },
        { test: /^Sentinel/,                          label: 'Microsoft Sentinel',             url: 'https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights/WorkspaceSelectorBlade' },
        { test: /^Purview|^Records|^Information Protection|^Information Barriers|^Privacy|^Priva/, label: 'Microsoft Purview', url: 'https://purview.microsoft.com/' },
        { test: /^Compliance Manager|^Purview Compliance/, label: 'Compliance Manager',         url: 'https://compliance.microsoft.com/compliancemanager' },
        { test: /^Endpoint Management|^Intune|^Endpoint Privilege|^Mobile Devices|^macOS/, label: 'Intune admin center', url: 'https://intune.microsoft.com/' },
        { test: /^Power Platform|^Power BI/,          label: 'Power Platform admin',           url: 'https://admin.powerplatform.microsoft.com/' },
        { test: /^M365 Apps/,                         label: 'M365 Apps admin',                url: 'https://config.office.com/' },
        { test: /^M365 Copilot/,                      label: 'Copilot admin',                  url: 'https://admin.cloud.microsoft/copilot' },
        { test: /^Azure AKS|^Azure Compute|^Azure Cosmos|^Azure Storage|^Azure PaaS|^Azure Networking|^Azure Subscriptions|^Azure Key Vault|^Azure Backup|^Azure Arc|^Azure Integration|^Azure DevOps/, label: 'Azure portal', url: 'https://portal.azure.com/' },
        { test: /^Logging|^Monitoring/,               label: 'Azure Monitor',                  url: 'https://portal.azure.com/#blade/Microsoft_OperationsManagementSuite_Workspace/AzureMonitoringBrowseBlade' },
        { test: /^Backup|^Recovery|^Update Management/, label: 'Azure Recovery / Update Mgmt', url: 'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.RecoveryServices%2Fvaults' },
        { test: /^Forms|^Bookings/,                   label: 'Microsoft 365 admin center',     url: 'https://admin.microsoft.com/' },
        { test: /^Tenant-wide|^Browser Security|^Windows Hardening|^Viva|^Yammer/, label: 'Microsoft 365 admin center', url: 'https://admin.microsoft.com/' }
    ];
    SA.PORTAL_DEFAULT = { label: 'Microsoft 365 admin center', url: 'https://admin.microsoft.com/' };

    SA.getPortal = function (item) {
        for (var i = 0; i < SA.PORTAL_MAP.length; i++) {
            if (SA.PORTAL_MAP[i].test.test(item.category)) return SA.PORTAL_MAP[i];
        }
        return SA.PORTAL_DEFAULT;
    };

    /* ----- Risk-color, glyphs, dates ------------------------- */

    SA.riskColor = function (risk) {
        return risk === 'high' ? 'var(--accent-red)'
             : risk === 'med'  ? 'var(--accent-gold)'
             : risk === 'low'  ? 'var(--primary-teal)'
                               : 'transparent';
    };

    /* Color-blind glyph: distinct shapes per severity. */
    SA.riskGlyph = function (risk) {
        return risk === 'high' ? '!!'
             : risk === 'med'  ? '!'
             : risk === 'low'  ? '·'
                               : '';
    };

    SA.diffDays = function (a, b) {
        var da = Date.parse(a), db = Date.parse(b);
        if (isNaN(da) || isNaN(db)) return null;
        return Math.floor((da - db) / 86400000);
    };

    /* ----- DOM utilities ------------------------------------- */

    SA.closestData = function (el, key) {
        while (el && el !== document) {
            if (el.dataset && el.dataset[key]) return el.dataset[key];
            el = el.parentNode;
        }
        return null;
    };

    SA.findAncestor = function (el, pred) {
        while (el && el !== document) {
            if (pred(el)) return el;
            el = el.parentNode;
        }
        return null;
    };

    window.SA = SA;
})();
