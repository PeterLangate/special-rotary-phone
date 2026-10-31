/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * build-gallery.ts — renders ALL 30 Sentinel emails (HTML + plain-text) plus an
 * `index.html` contact sheet into this folder, so every notification can be
 * eyeballed in a browser AND forwarded to real Outlook / Gmail / Apple Mail for
 * the cross-client litmus pass (go-live gating item #1 — string assertions can't
 * catch forced inversion / VML quirks / emoji-flag degradation).
 *
 * Lives in mockups/ (outside the Sentinel build) so it never bundles. Regenerate:
 *   tsc --rootDir X:\Source --outDir <tmp> --module commonjs --target ES2017 \
 *       --moduleResolution node --skipLibCheck --esModuleInterop \
 *       --useDefineForClassFields false  mockups/sentinel-emails/build-gallery.ts
 *   node <tmp>/CoreTenantSecurity/mockups/sentinel-emails/build-gallery.js
 *
 * NOTE: one "fat" superset finding feeds every leaf (each reads only its own
 * fields) — the gallery exercises LAYOUT/RENDERING, not realistic per-event copy.
 */

declare const require: any;
declare const process: any;
const fs: any = require("fs");

import { getCoreUtils } from "../../../Admin/kReusableCoreTS/kCoreHandler";
import { kEmailHTML } from "../../../Admin/kReusableCoreTS/kEmailHTML";
import { kLangateEmail } from "../../../Admin/kReusableCoreTS/kLangateEmail";
import { SentinelEmailFactory } from "../../Sentinel/notify/SentinelEmailFactory";

class EmailGalleryBuilder {

    private _OutDir: string = "X:\\Source\\CoreTenantSecurity\\mockups\\sentinel-emails";

    public Build = (): void => {
        if (getCoreUtils().kErrorMode) { return; }
        try {
            kLangateEmail.Configure(
                "https://contoso.sharepoint.com/sites/security/SitePages/CTS.aspx",
                "https://contoso.sharepoint.com/sites/security/SitePages/CTS.aspx?cts_manage=1",
                "langate.se", "Europe/Stockholm");
            if (fs.existsSync(this._OutDir) === false) { fs.mkdirSync(this._OutDir, { recursive: true }); }
            const Cells: string[] = [];
            for (const Kind of SentinelEmailFactory.Kinds) {
                const Cell: string = this._One(Kind);
                if (Cell !== "") { Cells.push(Cell); }
            }
            fs.writeFileSync(this._OutDir + "\\index.html", this._Index(Cells.join("\n")), "utf8");
            console.log("Gallery: " + String(Cells.length) + " emails -> " + this._OutDir + "\\index.html");
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder.Build");
        }
    };

    private _One = (Kind: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            const Email: kEmailHTML | null = SentinelEmailFactory.For(Kind, EmailGalleryBuilder.Fat);
            if (Email === null) { return ""; }
            const Html: string = Email.Render();
            const Text: string = Email.ToPlainText();
            const Row = Email.ToNotificationRow("https://dash", "email", false);
            fs.writeFileSync(this._OutDir + "\\" + Kind + ".html", Html, "utf8");
            fs.writeFileSync(this._OutDir + "\\" + Kind + ".txt", Text, "utf8");
            return this._Cell(Kind, Row.Severity, Row.Title);
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._One");
            return "";
        }
    };

    private _Cell = (Kind: string, Sev: string, Title: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            // Whole cell is a <button role> that opens the dialog viewer. The nested
            // iframe has pointer-events:none so it never swallows the click.
            const KindEsc: string = kEmailHTML.Escape(Kind);
            const TitleEsc: string = kEmailHTML.Escape(Title);
            return "<figure class=\"cell sev-" + Sev + "\" tabindex=\"0\" role=\"button\"" +
                " data-kind=\"" + KindEsc + "\" data-title=\"" + TitleEsc + "\">" +
                "<figcaption><span class=\"pill\">" + Sev.toUpperCase() + "</span>" +
                "<code>" + KindEsc + "</code></figcaption>" +
                "<div class=\"title\">" + TitleEsc + "</div>" +
                "<div class=\"frame\"><iframe loading=\"lazy\" src=\"" + Kind + ".html\"></iframe></div>" +
                "</figure>";
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._Cell");
            return "";
        }
    };

    private _Index = (Cells: string): string => {
        if (getCoreUtils().kErrorMode) { return ""; }
        try {
            return EmailGalleryBuilder._IndexTop.split("{{CELLS}}").join(Cells);
        } catch (e) {
            getCoreUtils().kGlobalErrorHandler(e, "EmailGalleryBuilder._Index");
            return "";
        }
    };

    private static _IndexTop: string =
        "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<title>CTS Sentinel — email gallery (all 30)</title><style>" +
        "body{margin:0;background:#0a141c;color:#e7eef2;font-family:'DM Sans',Segoe UI,Helvetica,Arial,sans-serif;}" +
        "header{padding:18px 24px;border-bottom:1px solid #1d3340;}" +
        "h1{margin:0;font-size:17px;font-weight:800;letter-spacing:.02em;}" +
        "header p{margin:6px 0 0;color:#9fb2bd;font-size:12.5px;max-width:80ch;}" +
        // Compact grid: 30 tiles now fit on a normal desktop viewport without scrolling.
        ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;padding:18px 24px;}" +
        ".cell{margin:0;background:#0f2333;border:1px solid #1d3340;border-radius:10px;overflow:hidden;" +
                "cursor:pointer;transition:transform .1s ease-out,border-color .15s;user-select:none;}" +
        ".cell:hover{transform:translateY(-2px);border-color:#3a6b82;}" +
        ".cell:focus-visible{outline:2px solid #3a6b82;outline-offset:2px;}" +
        "figcaption{display:flex;align-items:center;gap:6px;padding:8px 10px;font-size:11px;color:#9fb2bd;}" +
        "figcaption code{font-family:'DM Mono',Consolas,monospace;font-size:11px;}" +
        ".pill{font-size:9.5px;font-weight:800;letter-spacing:.06em;padding:2px 7px;border-radius:8px;color:#fff;}" +
        ".sev-critical .pill{background:#B33F3E;}.sev-high .pill{background:#d98324;}" +
        ".sev-medium .pill{background:#0b6e5c;}.sev-info .pill{background:#3a6b82;}" +
        ".sev-critical{border-color:#5e2b2a;}.sev-high{border-color:#5e451f;}" +
        ".title{padding:0 10px 8px;font-size:12px;font-weight:700;color:#fff;line-height:1.3;}" +
        ".frame{height:140px;overflow:hidden;background:#061520;border-top:1px solid #1d3340;}" +
        // Iframe scaled down aggressively and pointer-events:none so clicks pass through to the cell.
        ".frame iframe{width:700px;height:1000px;border:0;transform:scale(.3);transform-origin:top left;pointer-events:none;}" +
        // Modal viewer dialog.
        "dialog{border:0;padding:0;border-radius:12px;background:#0f2333;color:#e7eef2;" +
                "width:min(760px,96vw);max-height:92vh;overflow:hidden;" +
                "box-shadow:0 20px 60px rgba(0,0,0,.55);}" +
        "dialog::backdrop{background:rgba(6,21,32,.72);backdrop-filter:blur(4px);}" +
        ".dhdr{display:flex;align-items:center;gap:10px;padding:11px 14px;border-bottom:1px solid #1d3340;" +
                "background:#0a141c;position:sticky;top:0;z-index:1;}" +
        ".dhdr .pill{margin-right:2px;}" +
        ".dhdr .dttl{font-weight:700;font-size:13.5px;color:#fff;flex:1;min-width:0;" +
                "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
        ".dhdr code{color:#9fb2bd;font-size:11.5px;font-family:'DM Mono',Consolas,monospace;}" +
        ".dhdr a,.dhdr button{color:#8fb6c0;text-decoration:none;font-size:12px;padding:5px 10px;" +
                "border-radius:6px;border:1px solid #1d3340;background:transparent;cursor:pointer;" +
                "font-family:inherit;line-height:1;}" +
        ".dhdr a:hover,.dhdr button:hover{background:#1d3340;color:#fff;border-color:#3a6b82;}" +
        ".dhdr button.dx{font-size:16px;font-weight:700;padding:4px 10px;}" +
        "dialog iframe{width:100%;height:calc(92vh - 55px);border:0;background:#fff;display:block;}" +
        "</style></head><body><header><h1>CTS Sentinel — notification email gallery</h1>" +
        "</header><div class=\"grid\">{{CELLS}}</div>" +
        "<dialog id=\"viewer\" aria-labelledby=\"viewer-title\">" +
        "<div class=\"dhdr\">" +
        "<span class=\"pill\" data-role=\"pill\"></span>" +
        "<span class=\"dttl\" id=\"viewer-title\"></span>" +
        "<code data-role=\"kind\"></code>" +
        "<a href=\"\" target=\"_blank\" rel=\"noopener\" data-role=\"html-open\">Open in new tab</a>" +
        "<a href=\"\" target=\"_blank\" rel=\"noopener\" data-role=\"text-open\">Text variant</a>" +
        "<button type=\"button\" class=\"dx\" data-role=\"close\" aria-label=\"Close\">×</button>" +
        "</div>" +
        "<iframe title=\"Sentinel email preview\"></iframe>" +
        "</dialog>" +
        "<script>(function(){var d=document.getElementById('viewer');" +
        "var frame=d.querySelector('iframe');var ttl=d.querySelector('.dttl');" +
        "var code=d.querySelector('[data-role=\"kind\"]');" +
        "var pill=d.querySelector('[data-role=\"pill\"]');" +
        "var htmlA=d.querySelector('[data-role=\"html-open\"]');" +
        "var textA=d.querySelector('[data-role=\"text-open\"]');" +
        "var closeBtn=d.querySelector('[data-role=\"close\"]');" +
        "function sevOf(cell){var m=(cell.className||'').match(/sev-([a-z]+)/);return m?m[1]:'';}" +
        "function openCell(cell){var k=cell.getAttribute('data-kind');" +
        "var t=cell.getAttribute('data-title');ttl.textContent=t;code.textContent=k;" +
        "var s=sevOf(cell);pill.textContent=s.toUpperCase();" +
        "pill.className='pill sev-'+s+'-pill';pill.style.background=" +
        "(s==='critical'?'#B33F3E':s==='high'?'#d98324':s==='medium'?'#0b6e5c':'#3a6b82');" +
        "frame.src=k+'.html';htmlA.href=k+'.html';textA.href=k+'.txt';d.showModal();}" +
        "function closeIt(){d.close();frame.src='about:blank';}" +
        "document.querySelectorAll('.cell').forEach(function(cell){" +
        "cell.addEventListener('click',function(){openCell(cell);});" +
        "cell.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){" +
        "e.preventDefault();openCell(cell);}});});" +
        "closeBtn.addEventListener('click',closeIt);" +
        "d.addEventListener('click',function(e){" +
        "if(e.target===d){closeIt();}});" +
        "d.addEventListener('close',function(){frame.src='about:blank';});})();</script>" +
        "</body></html>";

    public static Fat: any = {
        SourceIp: "185.220.101.47", SourceFlag: "🇳🇱", LandedUpn: "jordan.lee@langate.se",
        LandedDisplay: "Jordan Lee",
        FailedCount: 5, WindowLabel: "47 min", AppDisplay: "Office 365 Exchange",
        ClientApp: "Other clients (legacy)", WhenIso: "2026-06-18T09:14:00Z", DedupKey: "fixture-dedup",
        Upn: "omar.reyes@langate.se", Display: "Omar Reyes",
        FromCity: "Stockholm", FromCountry: "Sweden", FromFlag: "🇸🇪",
        ToCity: "Tokyo", ToCountry: "Japan", ToFlag: "🇯🇵", DistanceKm: 8190, ImpliedSpeedKmh: 16380,
        ElapsedLabel: "30 min", ToIp: "203.0.113.9", ToDevice: "Windows 11",
        TopTargets: "5 accounts", LocationLabel: "Amsterdam, NL",
        RiskLevel: "high", RiskState: "atRisk", RiskEventTypes: "unfamiliarFeatures",
        Ip: "198.51.100.7", City: "Dallas", Country: "United States", Flag: "🇺🇸", App: "Azure Portal",
        NewCountry: "Brazil", NewFlag: "🇧🇷", BaselineCountries: "Sweden, Germany",
        AnomalyTags: "new device, new app, off-hours", TagCount: 3, Protocol: "IMAP4",
        Resource: "Office 365 Exchange Online", Client: "BAV2ROPC",
        FeedVerdict: "Tor exit node", Method: "Microsoft Authenticator",
        CurrentRateLabel: "62%", BaselineRateLabel: "8%", TopIps: "3 IPs", TopApps: "Exchange",
        ContributingDetections: "leaked credentials", PriorState: "atRisk", Trigger: "admin confirmation",
        DetectionType: "Leaked credentials", DetectionId: "det-99",
        IncidentId: "inc-901", IncidentTitle: "Multi-stage incident", SeverityLabel: "High",
        AlertCount: 4, ImpactedUsers: "3 users", MitreTechniques: "T1078, T1110", Classification: "TruePositive",
        EmailSubject: "Säljansvarig", EmailSender: "mattias@concitoconsulting.com",
        EmailRecipients: "magnus.carlsson@langate.se",
        IncidentWebUrl: "https://security.microsoft.com/incidents/inc-901",
        OldSeverity: "Medium", NewSeverity: "High", WhatChanged: "new alerts",
        AlertId: "alert-1", AlertTitle: "Suspicious inbox rule", Category: "Credential access",
        Entities: "user, mailbox", AlertWebUrl: "https://security.microsoft.com/alerts/alert-1",
        Assignee: "peter@langate.se", AssigneeName: "Peter Kalmström", AgeLabel: "3 days", IsUnassigned: false,
        AppName: "Contoso Add-in", ScopesGranted: "Mail.Read", ConsentedBy: "jane@langate.se",
        ConsentedByName: "Jane Smith",
        ServicePrincipalId: "sp-1", RoleName: "Global Administrator", PrincipalUpn: "mallory@langate.se",
        PrincipalDisplay: "Mallory Vale",
        AssignedBy: "admin@langate.se", AssignedByName: "Ada Admin", PolicyName: "Require MFA", ChangeType: "modified",
        Actor: "admin@langate.se", ActorName: "Ada Admin", CredentialType: "client secret", MethodRemoved: "Authenticator",
        WhatDisabled: "Security defaults", DomainName: "partner.example.com", ResetCount: 42,
        FeedSource: "Tor exit list", AffectedUsers: "2 users", Asn: "AS12345", Isp: "Example ISP",
        FirstSeenLabel: "today 09:14", AlarmType: "IDS/IPS signature", DeviceLabel: "UDM-Pro",
        SourceLabel: "192.0.2.5", Condition: "Missed run", Detail: "no poll in 20 min",
        PeriodLabel: "18 Jun 2026", Attempts: 12788, Failed: 412, RiskyUsers: 6, NewIncidents: 3,
        LegacyAuthSuccesses: 18, CaGaps: 2,
        Sections: [{ Heading: "Top risks", Lines: ["omar.reyes@langate.se", "kara.ellis@langate.se"] }]
    };
}

new EmailGalleryBuilder().Build();
process.exit(0);
